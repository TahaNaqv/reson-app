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
 * Poll transcription job status
 * @param {string} jobName - The transcription job name
 * @param {Function} onStatusUpdate - Callback for status updates
 * @param {Function} onComplete - Callback when job completes
 * @param {Function} onError - Callback for errors
 * @param {number} retryCount - Current retry count
 * @returns {Promise<Object|null>} - Job result or null
 */
export async function pollTranscriptionStatus(
    jobName,
    onStatusUpdate = null,
    onComplete = null,
    onError = null,
    retryCount = 0
) {
    const { MAX_RETRIES, POLL_INTERVAL, EXPONENTIAL_BACKOFF_BASE, EXPONENTIAL_BACKOFF_MAX, EXPONENTIAL_BACKOFF_MULTIPLIER, STATUS_UPDATE_INTERVAL } = TRANSCRIPTION_CONFIG;

    if (retryCount >= MAX_RETRIES) {
        const error = new Error('Transcription timeout. The video may still be processing. Please check again later.');
        if (onError) onError(error);
        return null;
    }

    try {
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
                if (onComplete) onComplete(job);
                return job;
            } else if (status === JOB_STATUS.FAILED) {
                const failureReason = job.FailureReason || 'Unknown error';
                const error = new Error(`Transcription failed: ${failureReason}`);
                if (onError) onError(error);
                return null;
            } else if (status === JOB_STATUS.IN_PROGRESS || status === JOB_STATUS.QUEUED) {
                // Calculate delay with exponential backoff
                const delay = Math.min(
                    EXPONENTIAL_BACKOFF_BASE * Math.pow(EXPONENTIAL_BACKOFF_MULTIPLIER, retryCount),
                    EXPONENTIAL_BACKOFF_MAX
                );

                // Update user at intervals
                if (onStatusUpdate && (retryCount === 0 || retryCount % STATUS_UPDATE_INTERVAL === 0)) {
                    onStatusUpdate(status, retryCount);
                }

                // Schedule next poll
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
                const error = new Error(`Unknown transcription status: ${status}`);
                if (onError) onError(error);
                return null;
            }
        } else {
            const error = new Error('Invalid transcription status response');
            if (onError) onError(error);
            return null;
        }
    } catch (error) {
        console.error('Error checking transcription status:', error);
        const { NETWORK_MAX_RETRIES, NETWORK_RETRY_DELAY } = TRANSCRIPTION_CONFIG;

        if (retryCount < NETWORK_MAX_RETRIES) {
            // Retry on network errors
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
            if (onError) onError(error);
            return null;
        }
    }
}

/**
 * Fetch transcript JSON from S3 and extract text
 * @param {string} jsonKey - The S3 key for the JSON file (without .json extension)
 * @param {string} folder - The S3 folder path
 * @returns {Promise<string|null>} - The transcript text or null if not available
 */
export async function fetchAndExtractTranscript(jsonKey, folder) {
    try {
        const jsonS3Key = jsonKey.endsWith('.json') ? jsonKey : `${jsonKey}.json`;

        const getJson = await axios.get(`/api/download?file=${encodeURIComponent(jsonS3Key)}&key=${encodeURIComponent(jsonS3Key)}&folder=${encodeURIComponent(folder)}`);

        if (getJson.status === 404 || getJson.data?.error) {
            console.warn(`Transcript JSON not found for ${jsonS3Key}`);
            return null;
        }

        const getJsonLink = getJson.data;
        const jsonLink = getJsonLink.durl;

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

        return transcript;
    } catch (error) {
        console.error(`Error fetching transcript for ${jsonKey}:`, error.message);
        return null;
    }
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
        if (!transcriptText || typeof transcriptText !== 'string' || transcriptText.trim().length === 0) {
            console.warn('Invalid transcript text provided');
            return false;
        }

        const fieldName = entityType === 'question' ? 'question_transcript' : 'answer_transcript';
        const endpoint = entityType === 'question' ? `/reson-api/question/${entityId}` : `/reson-api/answer/${entityId}`;

        const response = await axios.put(endpoint, {
            [fieldName]: transcriptText.trim()
        });

        if (response.status === 200 || response.status === 201) {
            console.log(`Transcript saved successfully for ${entityType} ${entityId}`);
            return true;
        }

        return false;
    } catch (error) {
        console.error(`Error saving transcript to database for ${entityType} ${entityId}:`, error.message);
        return false;
    }
}

/**
 * Generate unique job name to prevent collisions
 * @param {string} baseKey - The base S3 key
 * @returns {string} - Unique job name
 */
export function generateUniqueJobName(baseKey) {
    // Remove invalid characters and add timestamp for uniqueness
    const sanitized = baseKey.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
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
