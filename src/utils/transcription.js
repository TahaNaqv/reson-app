/**
 * Transcription Utility Functions
 * Centralized utilities for transcription operations
 */

import { TRANSCRIPTION_CONFIG, JOB_STATUS } from '@/config/transcription';
import axios from 'axios';

/**
 * Extract transcript text from AWS Transcribe JSON response
 * @param {Object} transcriptJson - The JSON response from AWS Transcribe
 * @returns {string|null} - The transcript text or null if invalid
 */
export function extractTranscript(transcriptJson) {
    try {
        if (!transcriptJson || typeof transcriptJson !== 'object') {
            return null;
        }

        // Validate and extract transcript from AWS Transcribe format
        if (
            transcriptJson.results &&
            transcriptJson.results.transcripts &&
            Array.isArray(transcriptJson.results.transcripts) &&
            transcriptJson.results.transcripts.length > 0
        ) {
            const transcript = transcriptJson.results.transcripts[0].transcript;
            if (typeof transcript === 'string' && transcript.trim().length > 0) {
                return transcript.trim();
            }
        }

        return null;
    } catch (error) {
        console.error('Error extracting transcript:', error);
        return null;
    }
}

/**
 * Validate AWS Transcribe JSON response structure
 * @param {Object} jsonData - The JSON data to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
export function validateTranscriptFormat(jsonData) {
    try {
        if (!jsonData || typeof jsonData !== 'object') {
            return { valid: false, error: 'Invalid JSON structure: not an object' };
        }

        if (!jsonData.results) {
            return { valid: false, error: 'Missing results field' };
        }

        if (!jsonData.results.transcripts) {
            return { valid: false, error: 'Missing transcripts field' };
        }

        if (!Array.isArray(jsonData.results.transcripts)) {
            return { valid: false, error: 'Transcripts must be an array' };
        }

        if (jsonData.results.transcripts.length === 0) {
            return { valid: false, error: 'No transcripts found in response' };
        }

        const firstTranscript = jsonData.results.transcripts[0];
        if (!firstTranscript.transcript || typeof firstTranscript.transcript !== 'string') {
            return { valid: false, error: 'Invalid transcript text format' };
        }

        return { valid: true };
    } catch (error) {
        return { valid: false, error: `Validation error: ${error.message}` };
    }
}

/**
 * Start a transcription job
 * @param {string} mediaUrl - The S3 URL of the media file
 * @param {string} outputBucket - The S3 folder path for output
 * @param {string} jobName - The job name (S3 key)
 * @param {string} languageCode - Optional language code (defaults to config)
 * @returns {Promise<Object>} - Response from transcription API with actualJobName
 */
export async function startTranscription(mediaUrl, outputBucket, jobName, languageCode = null) {
    try {
        const language = languageCode || TRANSCRIPTION_CONFIG.DEFAULT_LANGUAGE;
        const url = `/api/transcribe?media=${encodeURIComponent(mediaUrl)}&outputBucket=${encodeURIComponent(outputBucket)}&jobName=${encodeURIComponent(jobName)}&languageCode=${encodeURIComponent(language)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.status === 'false') {
            throw new Error(result.message || 'Failed to start transcription');
        }

        // Extract actual AWS job name from response
        // The API generates a unique job name that may differ from the input
        const actualJobName = result.response?.jobName ||
            result.response?.TranscriptionJob?.TranscriptionJobName ||
            result.jobName ||
            jobName; // Fallback to original if not found

        return {
            ...result,
            actualJobName // Add the actual AWS job name for status polling
        };
    } catch (error) {
        console.error('Error starting transcription:', error);
        throw error;
    }
}

/**
 * Poll transcription job status with exponential backoff
 * 
 * This function implements a recursive polling mechanism with exponential backoff to check
 * the status of an AWS Transcribe job. It reduces polling frequency as time passes to avoid
 * excessive API calls while still providing timely updates.
 * 
 * Exponential Backoff Strategy:
 * - Base delay: 5000ms (5 seconds)
 * - Multiplier: 1.2 (20% increase per poll)
 * - Max delay: 30000ms (30 seconds)
 * - Formula: delay = min(base * (multiplier ^ retryCount), maxDelay)
 * 
 * Example delays:
 * - Poll 0: 5000ms (5s)
 * - Poll 1: 6000ms (6s)
 * - Poll 2: 7200ms (7.2s)
 * - Poll 3: 8640ms (8.6s)
 * - Poll 10: ~30958ms (~31s, capped at 30s)
 * 
 * Status Update Intervals:
 * - User is notified every STATUS_UPDATE_INTERVAL polls (default: 12)
 * - This prevents notification spam while keeping users informed
 * 
 * Network Error Handling:
 * - Separate retry logic for network errors (transient failures)
 * - Uses fixed delay (NETWORK_RETRY_DELAY) for network retries
 * - Max network retries: 3
 * 
 * @param {string} jobName - The transcription job name (must be actual AWS job name)
 * @param {Function} onStatusUpdate - Callback for status updates (status, retryCount)
 * @param {Function} onComplete - Callback when job completes (receives job object)
 * @param {Function} onError - Callback for errors (receives error object)
 * @param {number} retryCount - Current retry count (internal, starts at 0)
 * @returns {Promise<Object|null>} - Job result when completed, or null on error/timeout
 */
export async function pollTranscriptionStatus(
    jobName,
    onStatusUpdate = null,
    onComplete = null,
    onError = null,
    retryCount = 0
) {
    const { MAX_RETRIES, POLL_INTERVAL, EXPONENTIAL_BACKOFF_BASE, EXPONENTIAL_BACKOFF_MAX, EXPONENTIAL_BACKOFF_MULTIPLIER, STATUS_UPDATE_INTERVAL } = TRANSCRIPTION_CONFIG;

    // Maximum retries reached - transcription is taking too long
    if (retryCount >= MAX_RETRIES) {
        const error = new Error('Transcription timeout. The video may still be processing. Please check again later.');
        if (onError) onError(error);
        return null;
    }

    try {
        // Fetch current job status from API
        const resp = await fetch(`/api/transcribe/status?jobName=${encodeURIComponent(jobName)}`);
        const result = await resp.json();

        if (result.status === 'false') {
            const error = new Error(result.message || 'Error checking transcription status');
            if (onError) onError(error);
            return null;
        }

        if (result.response?.TranscriptionJob) {
            const job = result.response.TranscriptionJob;
            const status = job.TranscriptionJobStatus;

            if (status === JOB_STATUS.COMPLETED) {
                // Job completed successfully - call completion callback
                if (onComplete) onComplete(job);
                return job;
            } else if (status === JOB_STATUS.FAILED) {
                // Job failed - extract failure reason and call error callback
                const failureReason = job.FailureReason || 'Unknown error';
                const error = new Error(`Transcription failed: ${failureReason}`);
                if (onError) onError(error);
                return null;
            } else if (status === JOB_STATUS.IN_PROGRESS || status === JOB_STATUS.QUEUED) {
                // Job still processing - calculate delay with exponential backoff
                // Formula: delay = base * (multiplier ^ retryCount), capped at maxDelay
                // This reduces polling frequency over time to avoid excessive API calls
                const delay = Math.min(
                    EXPONENTIAL_BACKOFF_BASE * Math.pow(EXPONENTIAL_BACKOFF_MULTIPLIER, retryCount),
                    EXPONENTIAL_BACKOFF_MAX
                );

                // Update user at intervals to prevent notification spam
                // Notify on first poll (retryCount === 0) and every STATUS_UPDATE_INTERVAL polls
                if (onStatusUpdate && (retryCount === 0 || retryCount % STATUS_UPDATE_INTERVAL === 0)) {
                    onStatusUpdate(status, retryCount);
                }

                // Schedule next poll with calculated delay (recursive call)
                return new Promise((resolve) => {
                    setTimeout(async () => {
                        const result = await pollTranscriptionStatus(
                            jobName,
                            onStatusUpdate,
                            onComplete,
                            onError,
                            retryCount + 1
                        );
                        resolve(result);
                    }, delay);
                });
            } else {
                // Unknown status - should not happen, but handle gracefully
                const error = new Error(`Unknown transcription status: ${status}`);
                if (onError) onError(error);
                return null;
            }
        } else {
            // Invalid response format - API returned unexpected structure
            const error = new Error('Invalid transcription status response');
            if (onError) onError(error);
            return null;
        }
    } catch (error) {
        // Network or other transient error - retry with fixed delay
        console.error('Error checking transcription status:', error);
        const { NETWORK_MAX_RETRIES, NETWORK_RETRY_DELAY } = TRANSCRIPTION_CONFIG;

        if (retryCount < NETWORK_MAX_RETRIES) {
            // Retry on network errors with fixed delay (not exponential backoff)
            // Network errors are typically transient and should resolve quickly
            return new Promise((resolve) => {
                setTimeout(async () => {
                    const result = await pollTranscriptionStatus(
                        jobName,
                        onStatusUpdate,
                        onComplete,
                        onError,
                        retryCount + 1
                    );
                    resolve(result);
                }, NETWORK_RETRY_DELAY);
            });
        } else {
            // Max network retries reached - give up
            if (onError) onError(error);
            return null;
        }
    }
}

/**
 * Fetch transcript JSON from S3 and extract text
 * Includes retry logic with exponential backoff for S3 eventual consistency
 * @param {string} jsonKey - The S3 key for the JSON file (without .json extension)
 * @param {string} folder - The S3 folder path
 * @param {number} maxRetries - Maximum number of retry attempts (default: 5)
 * @param {number} initialDelay - Initial delay in milliseconds before first retry (default: 2000)
 * @returns {Promise<string|null>} - The transcript text or null if not available
 */
export async function fetchAndExtractTranscript(jsonKey, folder, maxRetries = 5, initialDelay = 2000) {
    const jsonS3Key = jsonKey.endsWith('.json') ? jsonKey : `${jsonKey}.json`;
    let lastError = null;

    // Wait initial delay for S3 eventual consistency before first attempt
    await new Promise(resolve => setTimeout(resolve, initialDelay));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Attempt to fetch the JSON file from S3
            const getJson = await axios.get(`/api/download?file=${encodeURIComponent(jsonS3Key)}&key=${encodeURIComponent(jsonS3Key)}&folder=${encodeURIComponent(folder)}`);

            if (getJson.status === 404 || getJson.data?.error) {
                if (attempt < maxRetries) {
                    // Calculate exponential backoff delay: initialDelay * 2^attempt
                    const delay = initialDelay * Math.pow(2, attempt);
                    console.log(`Transcript JSON not found for ${jsonS3Key}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                } else {
                    console.warn(`Transcript JSON not found for ${jsonS3Key} after ${maxRetries + 1} attempts`);
                    return null;
                }
            }

            const getJsonLink = getJson.data;
            const jsonLink = getJsonLink.durl;

            // Fetch the actual JSON content
            const jsonResponse = await axios.get(jsonLink);
            const transcriptJson = jsonResponse.data;

            // Validate format
            const validation = validateTranscriptFormat(transcriptJson);
            if (!validation.valid) {
                console.warn('Invalid transcript format:', validation.error);
                return null;
            }

            // Extract transcript
            const transcript = extractTranscript(transcriptJson);

            // Validate transcript is not empty
            if (transcript && transcript.trim().length === 0) {
                console.warn('Transcript extracted but is empty');
                return null;
            }

            if (attempt > 0) {
                console.log(`Successfully fetched transcript after ${attempt} retries`);
            }

            return transcript;
        } catch (error) {
            lastError = error;

            // If it's a network error or 404, retry with exponential backoff
            if (attempt < maxRetries && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.response?.status === 404)) {
                const delay = initialDelay * Math.pow(2, attempt);
                console.warn(`Error fetching transcript for ${jsonKey} (attempt ${attempt + 1}/${maxRetries + 1}): ${error.message}, retrying in ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            } else {
                // Non-retryable error or max retries reached
                console.error(`Error fetching transcript for ${jsonKey} after ${attempt + 1} attempts:`, {
                    error: error.message,
                    code: error.code,
                    status: error.response?.status,
                    stack: error.stack
                });
                break;
            }
        }
    }

    // All retries exhausted
    console.error(`Failed to fetch transcript for ${jsonKey} after ${maxRetries + 1} attempts. Last error:`, lastError?.message || 'Unknown error');
    return null;
}

/**
 * Get transcript from cache (database) or fetch from S3
 * Checks database first, then falls back to S3 if database field is empty/NA
 * @param {string} jsonKey - The S3 key for the JSON file (without .json extension)
 * @param {string} folder - The S3 folder path
 * @param {string} entityType - 'question' or 'answer'
 * @param {string|number} entityId - The ID of the question or answer
 * @returns {Promise<string|null>} - The transcript text or null if not available
 */
export async function getTranscript(jsonKey, folder, entityType, entityId) {
    try {
        // First, try to get transcript from database
        const fieldName = entityType === 'question' ? 'question_transcript' : 'answer_transcript';
        const endpoint = entityType === 'question' ? `/reson-api/question/${entityId}` : `/reson-api/answer/${entityId}`;

        try {
            const response = await axios.get(endpoint);

            if (response.status === 200 && response.data) {
                const cachedTranscript = response.data[fieldName];

                // Check if cached transcript is valid (not empty, not 'NA', not null)
                if (cachedTranscript &&
                    cachedTranscript !== 'NA' &&
                    cachedTranscript.trim().length > 0) {
                    console.log(`Using cached transcript from database for ${entityType} ${entityId}`);
                    return cachedTranscript.trim();
                }
            }
        } catch (dbError) {
            // If database lookup fails, continue to S3 fetch
            console.warn(`Could not fetch transcript from database for ${entityType} ${entityId}:`, dbError.message);
        }

        // If database doesn't have valid transcript, fetch from S3
        console.log(`Fetching transcript from S3 for ${entityType} ${entityId}`);
        const transcriptText = await fetchAndExtractTranscript(jsonKey, folder);

        // If we got a transcript from S3, update the database
        if (transcriptText && entityId) {
            try {
                await saveTranscriptToDatabase(transcriptText, entityType, entityId);
                console.log(`Updated database with transcript from S3 for ${entityType} ${entityId}`);
            } catch (saveError) {
                // Log but don't fail - we still have the transcript
                console.warn(`Failed to update database with transcript:`, saveError.message);
            }
        }

        return transcriptText;
    } catch (error) {
        console.error(`Error getting transcript for ${entityType} ${entityId}:`, error.message);
        return null;
    }
}

/**
 * Validate transcript content before saving
 * @param {string} transcriptText - The transcript text to validate
 * @returns {Object} - { valid: boolean, error?: string }
 */
function validateTranscriptContent(transcriptText) {
    // Minimum length check (reject empty or too short transcripts)
    const MIN_LENGTH = 10; // Minimum 10 characters
    if (!transcriptText || typeof transcriptText !== 'string') {
        return { valid: false, error: 'Transcript must be a non-empty string' };
    }

    const trimmed = transcriptText.trim();
    if (trimmed.length < MIN_LENGTH) {
        return { valid: false, error: `Transcript too short (minimum ${MIN_LENGTH} characters, got ${trimmed.length})` };
    }

    // Maximum length check (prevent extremely long transcripts - likely data corruption)
    const MAX_LENGTH = 100000; // Maximum 100,000 characters (~20,000 words)
    if (trimmed.length > MAX_LENGTH) {
        return { valid: false, error: `Transcript too long (maximum ${MAX_LENGTH} characters, got ${trimmed.length})` };
    }

    // Check if transcript is only whitespace or special characters
    // Allow letters, numbers, spaces, punctuation, and common Unicode characters
    const hasValidContent = /[\p{L}\p{N}]/u.test(trimmed);
    if (!hasValidContent) {
        return { valid: false, error: 'Transcript contains only whitespace or special characters' };
    }

    // Check for valid UTF-8 encoding (basic check)
    try {
        // Try to encode/decode to check for encoding issues
        const encoded = encodeURIComponent(trimmed);
        decodeURIComponent(encoded);
    } catch (encodingError) {
        return { valid: false, error: 'Transcript contains invalid character encoding' };
    }

    return { valid: true };
}

/**
 * Save transcript to database
 * @param {string} transcriptText - The transcript text to save
 * @param {string} entityType - 'question' or 'answer'
 * @param {string|number} entityId - The ID of the question or answer
 * @returns {Promise<boolean>} - True if successful
 */
export async function saveTranscriptToDatabase(transcriptText, entityType, entityId) {
    try {
        // Validate transcript content
        const validation = validateTranscriptContent(transcriptText);
        if (!validation.valid) {
            console.warn(`Transcript validation failed for ${entityType} ${entityId}:`, validation.error);
            return false;
        }

        const trimmed = transcriptText.trim();
        const fieldName = entityType === 'question' ? 'question_transcript' : 'answer_transcript';
        const endpoint = entityType === 'question' ? `/reson-api/question/${entityId}` : `/reson-api/answer/${entityId}`;

        // Fetch existing record to include required fields expected by backend PUT routes
        const existingResponse = await axios.get(endpoint);
        if (existingResponse.status !== 200 || !existingResponse.data) {
            console.warn(`Could not load existing ${entityType} ${entityId} for transcript save`);
            return false;
        }

        const existing = existingResponse.data;

        // Build payload including all required fields for PUT
        let payload = {};
        if (entityType === 'question') {
            const { question_key, job_s3_folder, question_title, question_video_url } = existing;
            if (!question_key || !job_s3_folder || !question_title || !question_video_url) {
                console.error(`Missing required question fields for PUT on ${entityId}`, { question_key, job_s3_folder, question_title, question_video_url });
                return false;
            }
            payload = {
                question_key,
                job_s3_folder,
                question_title,
                question_video_url,
                [fieldName]: trimmed
            };
        } else {
            const { candidate_id, job_id, question_id, answer_url, answer_title, answer_key, job_s3_folder } = existing;
            if (!candidate_id || !answer_url || !answer_title || !answer_key || !job_s3_folder) {
                console.error(`Missing required answer fields for PUT on ${entityId}`, { candidate_id, answer_url, answer_title, answer_key, job_s3_folder });
                return false;
            }
            payload = {
                candidate_id,
                job_id,
                question_id,
                answer_url,
                answer_title,
                answer_key,
                job_s3_folder,
                [fieldName]: trimmed
            };
        }

        const response = await axios.put(endpoint, payload);

        if (response.status === 200 || response.status === 201) {
            console.log(`Transcript saved successfully for ${entityType} ${entityId} (length: ${trimmed.length} characters)`);
            return true;
        }

        return false;
    } catch (error) {
        console.error(`Error saving transcript to database for ${entityType} ${entityId}:`, {
            error: error.message,
            status: error.response?.status,
            stack: error.stack
        });
        return false;
    }
}

/**
 * Generate unique job name to prevent collisions
 * 
 * AWS Transcribe requires unique job names. This function generates a unique name by:
 * 1. Sanitizing the base key (removing invalid characters)
 * 2. Appending timestamp (milliseconds since epoch)
 * 3. Appending random string (6 characters)
 * 
 * AWS Job Name Restrictions:
 * - Only letters, numbers, dots (.), underscores (_), and hyphens (-)
 * - Maximum 200 characters
 * - Must be unique across all jobs in the account
 * 
 * Example:
 * - Input: "video file.mp4"
 * - Output: "video_file_mp4_1704067200000_a3f9k2"
 * 
 * @param {string} baseKey - The base S3 key (may contain invalid characters)
 * @returns {string} - Unique job name compliant with AWS requirements
 */
export function generateUniqueJobName(baseKey) {
    // Remove invalid characters (only keep letters, numbers, dots, underscores, hyphens)
    // Replace all other characters with underscore
    const sanitized = baseKey.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Add timestamp for uniqueness (milliseconds since epoch)
    const timestamp = Date.now();

    // Add random string (6 characters) for additional uniqueness
    // Math.random().toString(36) generates base-36 string, substring(2, 8) takes 6 chars
    const random = Math.random().toString(36).substring(2, 8);

    return `${sanitized}_${timestamp}_${random}`;
}

/**
 * Get user-friendly error message for transcription errors
 * @param {Error|Object} error - The error object
 * @returns {string} - User-friendly error message
 */
export function getTranscriptionErrorMessage(error) {
    if (!error) {
        return 'An unknown error occurred during transcription';
    }

    const errorMessage = error.message || error.toString();
    const errorName = error.name || '';

    // Network errors
    if (errorMessage.includes('fetch') || errorMessage.includes('network') || errorMessage.includes('NetworkError')) {
        return 'Network error. Please check your connection and try again.';
    }

    // AWS errors
    if (errorName === 'NotFoundException') {
        return 'Transcription job not found. It may have been deleted or never created.';
    }

    if (errorName === 'ConflictException') {
        return 'A transcription job with this name already exists. Please try again.';
    }

    if (errorName === 'AccessDeniedException' || errorName === 'UnauthorizedOperation') {
        return 'Access denied. Please check your permissions.';
    }

    if (errorName === 'ValidationException' || errorName === 'BadRequestException') {
        return 'Invalid request. Please check your video file and try again.';
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('Transcription timeout')) {
        return 'Transcription is taking longer than expected. The video may still be processing. Please check again later.';
    }

    // Empty transcript errors
    if (errorMessage.includes('empty') || errorMessage.includes('no transcript')) {
        return 'Transcription completed but no text was found. The video may not contain speech.';
    }

    // Return original message if no specific match
    return errorMessage || 'Failed to process transcription. Please try again.';
}
