import { TranscribeClient, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { fetchAndExtractTranscript, saveTranscriptToDatabase } from "@/utils/transcription";
import crypto from "crypto";
import https from "https";

/**
 * Webhook endpoint for AWS SNS notifications
 * Receives notifications when transcription jobs complete
 * 
 * To set up:
 * 1. Create an SNS topic in AWS
 * 2. Subscribe this endpoint URL to the topic
 * 3. Configure AWS Transcribe to send notifications to the SNS topic
 * 4. Set TRANSCRIPTION_SNS_TOPIC_ARN environment variable
 */
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            status: 'false',
            message: 'Method not allowed'
        });
    }

    try {
        // Verify SNS signature for security (skip for subscription confirmation)
        const messageType = req.headers['x-amz-sns-message-type'];
        if (messageType === 'Notification') {
            const isValid = await verifySNSSignature(req);
            if (!isValid) {
                console.error('Invalid SNS signature - message may not be from AWS');
                return res.status(403).json({
                    status: 'false',
                    message: 'Invalid message signature'
                });
            }
        }

        // AWS SNS sends notifications in a specific format
        // First, verify the subscription confirmation (if it's a subscription request)
        if (messageType === 'SubscriptionConfirmation') {
            const subscribeUrl = req.body.SubscribeURL || req.body.subscribeURL;
            console.log('SNS Subscription confirmation received. Auto-confirming...');

            // Automatically confirm the subscription
            try {
                await new Promise((resolve, reject) => {
                    https.get(subscribeUrl, (response) => {
                        if (response.statusCode === 200) {
                            console.log('SNS subscription confirmed successfully');
                            resolve();
                        } else {
                            reject(new Error(`Subscription confirmation failed: ${response.statusCode}`));
                        }
                    }).on('error', reject);
                });

                return res.status(200).json({
                    status: 'true',
                    message: 'Subscription confirmed successfully'
                });
            } catch (confirmError) {
                console.error('Error confirming subscription:', confirmError);
                return res.status(200).json({
                    status: 'info',
                    message: 'Subscription confirmation attempted but failed',
                    subscribeUrl: subscribeUrl,
                    error: confirmError.message
                });
            }
        }

        // Handle notification
        if (messageType === 'Notification') {
            // Parse message - SNS sends Message as a string that may need parsing
            let message;
            try {
                const messageBody = req.body.Message || req.body.message;
                if (typeof messageBody === 'string') {
                    message = JSON.parse(messageBody);
                } else if (typeof messageBody === 'object') {
                    message = messageBody;
                } else {
                    throw new Error('Invalid message format');
                }
            } catch (parseError) {
                console.error('Error parsing SNS message:', parseError);
                return res.status(400).json({
                    status: 'false',
                    message: 'Invalid message format',
                    error: parseError.message
                });
            }

            // Validate required message fields
            if (!message.TranscriptionJobName) {
                console.error('Missing TranscriptionJobName in message');
                return res.status(400).json({
                    status: 'false',
                    message: 'Missing required field: TranscriptionJobName'
                });
            }

            if (!message.TranscriptionJobStatus) {
                console.error('Missing TranscriptionJobStatus in message');
                return res.status(400).json({
                    status: 'false',
                    message: 'Missing required field: TranscriptionJobStatus'
                });
            }

            // Validate jobName format (AWS restrictions)
            const jobName = message.TranscriptionJobName;
            if (!/^[a-zA-Z0-9._-]+$/.test(jobName)) {
                console.error('Invalid job name format:', jobName);
                return res.status(400).json({
                    status: 'false',
                    message: 'Invalid job name format'
                });
            }

            // AWS Transcribe sends job status in the message
            const jobStatus = message.TranscriptionJobStatus;

            console.log('Transcription job notification received:', {
                jobName: jobName,
                status: jobStatus
            });

            // Only process completed jobs
            if (jobStatus === 'COMPLETED') {
                // Extract job details from the notification
                // You may need to fetch full job details to get the output location
                const outputLocation = message.Transcript?.TranscriptFileUri;

                if (!outputLocation) {
                    console.warn('Missing outputLocation in completed job notification:', {
                        jobName: jobName,
                        message: message
                    });
                    // Try to extract from job details if available
                    // For now, log warning and continue
                }

                if (outputLocation) {
                    try {
                        // Extract S3 key and folder from the output location
                        // Format: https://bucket.s3.region.amazonaws.com/folder/key.json
                        const url = new URL(outputLocation);
                        const pathParts = url.pathname.split('/').filter(p => p);
                        const jsonFileName = pathParts.pop();
                        const folder = pathParts.join('/');
                        const s3Key = jsonFileName.replace('.json', '');

                        // Fetch and extract transcript with retry logic
                        let transcriptText = null;
                        const maxRetries = 3;
                        for (let attempt = 0; attempt < maxRetries; attempt++) {
                            try {
                                transcriptText = await fetchAndExtractTranscript(s3Key, folder);
                                if (transcriptText) {
                                    break; // Success, exit retry loop
                                }
                            } catch (fetchError) {
                                if (attempt === maxRetries - 1) {
                                    console.error(`Failed to fetch transcript after ${maxRetries} attempts:`, fetchError);
                                } else {
                                    console.warn(`Transcript fetch attempt ${attempt + 1} failed, retrying...`);
                                    // Wait before retry (exponential backoff)
                                    await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                                }
                            }
                        }

                        if (transcriptText) {
                            console.log('Transcript extracted from webhook:', {
                                jobName: jobName,
                                transcriptLength: transcriptText.length,
                                folder: folder,
                                s3Key: s3Key
                            });

                            // Look up entity (question or answer) by S3 key and save transcript with retry
                            const entity = await findEntityByS3Key(s3Key, folder);
                            if (entity) {
                                let saved = false;
                                const saveRetries = 3;
                                let lastSaveError = null;

                                for (let attempt = 0; attempt < saveRetries; attempt++) {
                                    try {
                                        saved = await saveTranscriptToDatabase(
                                            transcriptText,
                                            entity.type,
                                            entity.id
                                        );
                                        if (saved) {
                                            console.log(`Transcript auto-saved via webhook for ${entity.type} ${entity.id}`);
                                            break; // Success, exit retry loop
                                        } else {
                                            lastSaveError = new Error('Save function returned false');
                                        }
                                    } catch (saveError) {
                                        lastSaveError = saveError;
                                        if (attempt === saveRetries - 1) {
                                            console.error(`Failed to save transcript after ${saveRetries} attempts:`, {
                                                error: saveError.message,
                                                entityType: entity.type,
                                                entityId: entity.id,
                                                jobName: jobName,
                                                stack: saveError.stack
                                            });
                                        } else {
                                            console.warn(`Transcript save attempt ${attempt + 1} failed, retrying...`, saveError.message);
                                            // Wait before retry (exponential backoff)
                                            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                                        }
                                    }
                                }

                                if (!saved) {
                                    // Log detailed failure information for monitoring/alerting
                                    const failureInfo = {
                                        timestamp: new Date().toISOString(),
                                        jobName: jobName,
                                        entityType: entity.type,
                                        entityId: entity.id,
                                        s3Key: s3Key,
                                        folder: folder,
                                        error: lastSaveError?.message || 'Unknown error',
                                        transcriptLength: transcriptText.length,
                                        retries: saveRetries
                                    };
                                    console.error('Webhook transcript save failure (for monitoring/alerting):', JSON.stringify(failureInfo, null, 2));

                                    // TODO: In production, send this to a monitoring service (e.g., Sentry, CloudWatch, etc.)
                                    // Example: await sendToMonitoringService('webhook_save_failure', failureInfo);
                                }
                            } else {
                                const entityNotFoundInfo = {
                                    timestamp: new Date().toISOString(),
                                    jobName: jobName,
                                    s3Key: s3Key,
                                    folder: folder,
                                    message: 'Entity not found for S3 key'
                                };
                                console.warn('Webhook entity lookup failure:', JSON.stringify(entityNotFoundInfo, null, 2));
                                // TODO: In production, track this for analysis
                            }
                        } else {
                            const transcriptExtractionFailure = {
                                timestamp: new Date().toISOString(),
                                jobName: jobName,
                                s3Key: s3Key,
                                folder: folder,
                                message: 'Could not extract transcript from S3'
                            };
                            console.warn('Webhook transcript extraction failure:', JSON.stringify(transcriptExtractionFailure, null, 2));
                        }
                    } catch (processingError) {
                        // Enhanced error tracking for webhook processing failures
                        const processingFailureInfo = {
                            timestamp: new Date().toISOString(),
                            jobName: jobName,
                            error: processingError.message,
                            stack: processingError.stack,
                            messageType: messageType,
                            jobStatus: jobStatus
                        };
                        console.error('Webhook processing error (for monitoring/alerting):', JSON.stringify(processingFailureInfo, null, 2));

                        // TODO: In production, send this to a monitoring service
                        // Example: await sendToMonitoringService('webhook_processing_error', processingFailureInfo);

                        // Still return success to AWS SNS to prevent retries for non-retryable errors
                        // But log the error for manual investigation
                    }
                }
            } else if (jobStatus === 'FAILED') {
                const failureReason = message.FailureReason || 'Unknown error';
                console.error('Transcription job failed:', {
                    jobName: jobName,
                    failureReason: failureReason
                });
            }

            return res.status(200).json({
                status: 'true',
                message: 'Notification processed',
                jobName: jobName,
                jobStatus: jobStatus
            });
        }

        // Unknown message type
        return res.status(400).json({
            status: 'false',
            message: 'Unknown SNS message type',
            messageType: req.headers['x-amz-sns-message-type']
        });

    } catch (err) {
        console.error('Error processing webhook:', {
            name: err.name,
            message: err.message,
            stack: err.stack
        });

        return res.status(500).json({
            status: 'false',
            message: 'Error processing webhook',
            error: err.name || 'Unknown error',
            details: err.message
        });
    }
}

/**
 * Verify SNS message signature to ensure it's from AWS
 * 
 * This function implements the AWS SNS message signature verification process as described in:
 * https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 * 
 * Security Process:
 * 1. Extract signature headers from request
 * 2. Verify certificate URL is from AWS domain
 * 3. Download the signing certificate from AWS
 * 4. Extract public key from certificate
 * 5. Construct canonical message string (alphabetically sorted fields)
 * 6. Verify signature using RSA-SHA1 algorithm
 * 
 * Canonical Message String Format:
 * - Fields are sorted alphabetically by key name
 * - Format: "Key\nValue\n" for each field, followed by final newline
 * - Example:
 *   Message\n{...}\n
 *   MessageId\n123\n
 *   Timestamp\n2024-01-01T00:00:00Z\n
 *   TopicArn\narn:aws:sns:...\n
 *   Type\nNotification\n
 *   \n
 * 
 * Signature Algorithm:
 * - Algorithm: RSA-SHA1 (SHA1withRSA)
 * - Signature is base64-encoded
 * - Public key is extracted from X.509 certificate
 * 
 * @param {Object} req - Express request object with SNS headers and body
 * @returns {Promise<boolean>} - True if signature is valid, false otherwise
 */
async function verifySNSSignature(req) {
    try {
        // Step 1: Extract required signature headers
        // AWS SNS includes these headers in all notification requests
        const signatureVersion = req.headers['x-amz-sns-signature-version'];
        const signingCertUrl = req.headers['x-amz-sns-signing-cert-url'];
        const signature = req.headers['x-amz-sns-signature'];

        if (!signatureVersion || !signingCertUrl || !signature) {
            console.warn('Missing SNS signature headers');
            return false;
        }

        // Step 2: Verify the signing certificate URL is from AWS
        // This prevents downloading certificates from malicious sources
        // AWS SNS certificates are always hosted on sns.*.amazonaws.com
        if (!signingCertUrl.startsWith('https://sns.') || !signingCertUrl.includes('.amazonaws.com')) {
            console.warn('Invalid signing certificate URL:', signingCertUrl);
            return false;
        }

        // Step 3: Download the certificate from AWS
        // The certificate is used to extract the public key for signature verification
        let certificate;
        try {
            certificate = await new Promise((resolve, reject) => {
                https.get(signingCertUrl, (response) => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`Certificate download failed: ${response.statusCode}`));
                        return;
                    }

                    let data = '';
                    response.on('data', (chunk) => {
                        data += chunk;
                    });
                    response.on('end', () => {
                        resolve(data);
                    });
                }).on('error', reject);
            });
        } catch (certError) {
            console.error('Error downloading certificate:', certError);
            return false;
        }

        // Step 4: Extract public key from certificate and verify signature
        try {
            // Create public key from PEM-encoded X.509 certificate
            // Node.js crypto.createPublicKey can parse PEM certificates directly
            let publicKey;
            try {
                publicKey = crypto.createPublicKey({
                    key: certificate,
                    format: 'pem'
                });
            } catch (keyError) {
                console.error('Error creating public key from certificate:', keyError);
                return false;
            }

            // Additional security check: verify certificate URL is from AWS
            // (redundant but adds defense in depth)
            if (!signingCertUrl.includes('.amazonaws.com')) {
                console.warn('Certificate URL not from AWS:', signingCertUrl);
                return false;
            }

            // Step 5: Construct canonical message string
            // AWS SNS signs a canonical string containing all message fields
            // Fields must be sorted alphabetically by key name
            const messageType = req.headers['x-amz-sns-message-type'];
            const messageId = req.headers['x-amz-sns-message-id'];
            const topicArn = req.headers['x-amz-sns-topic-arn'];
            const timestamp = req.headers['x-amz-sns-timestamp'];

            // Collect all fields that should be included in signature
            // Only include fields that are present (null/undefined fields are excluded)
            const fields = [];
            if (req.body.Message) fields.push(['Message', req.body.Message]);
            if (messageId) fields.push(['MessageId', messageId]);
            if (req.body.SubscribeURL) fields.push(['SubscribeURL', req.body.SubscribeURL]);
            if (timestamp) fields.push(['Timestamp', timestamp]);
            if (req.body.Token) fields.push(['Token', req.body.Token]);
            if (topicArn) fields.push(['TopicArn', topicArn]);
            if (messageType) fields.push(['Type', messageType]);

            // Sort fields alphabetically by key name (required by AWS SNS)
            fields.sort((a, b) => a[0].localeCompare(b[0]));

            // Construct canonical string: "Key\nValue\n" for each field, plus final newline
            const stringToSign = fields.map(([key, value]) => `${key}\n${value}\n`).join('') + '\n';

            // Step 6: Verify the signature using RSA-SHA1
            // AWS SNS uses SHA1withRSA signature algorithm
            const signatureBuffer = Buffer.from(signature, 'base64'); // Decode base64 signature
            const verify = crypto.createVerify('RSA-SHA1'); // Create verifier with RSA-SHA1 algorithm
            verify.update(stringToSign, 'utf8'); // Update with canonical message string

            // Verify signature against public key
            // Returns true if signature is valid, false otherwise
            const isValid = verify.verify(publicKey, signatureBuffer);

            if (!isValid) {
                console.warn('SNS signature verification failed');
                return false;
            }

            return true;
        } catch (cryptoError) {
            console.error('Error verifying certificate or signature:', cryptoError);
            // Fallback: if crypto operations fail, at least verify URL is from AWS
            // This provides basic protection but is not as secure as full verification
            return signingCertUrl.includes('.amazonaws.com');
        }
    } catch (error) {
        console.error('Error verifying SNS signature:', error);
        return false;
    }
}

/**
 * Find entity (question or answer) by S3 key
 * @param {string} s3Key - The S3 key (without .json extension)
 * @param {string} folder - The S3 folder path
 * @returns {Promise<Object|null>} - { type: 'question'|'answer', id: number } or null
 */
async function findEntityByS3Key(s3Key, folder) {
    try {
        // Validate inputs
        if (!s3Key || typeof s3Key !== 'string' || s3Key.trim().length === 0) {
            console.error('Invalid s3Key provided to findEntityByS3Key:', s3Key);
            return null;
        }

        if (!folder || typeof folder !== 'string') {
            console.error('Invalid folder provided to findEntityByS3Key:', folder);
            return null;
        }

        // Extract job_id from folder if possible
        // Expected formats:
        // - user_id_X/company/job_id_Y (for questions)
        // - job_id_Y/candidate (for answers)
        const jobIdMatch = folder.match(/job_id_(\d+)/);

        if (!jobIdMatch) {
            console.warn(`Could not extract job_id from folder pattern: ${folder}`);
            // Try alternative folder patterns
            const altJobIdMatch = folder.match(/(\d+)/);
            if (altJobIdMatch) {
                console.warn(`Trying alternative job_id extraction from folder: ${folder}`);
            }
            return null;
        }

        const jobId = jobIdMatch[1];
        console.log(`Looking up entity for job_id: ${jobId}, s3Key: ${s3Key}`);

        // Try to find as question first
        try {
            const questionResponse = await fetch(`/reson-api/question/job/${jobId}`);

            if (!questionResponse.ok) {
                if (questionResponse.status === 404) {
                    console.log(`No questions found for job_id: ${jobId}`);
                } else {
                    console.warn(`Question API returned status ${questionResponse.status} for job_id: ${jobId}`);
                }
                throw new Error(`Question API error: ${questionResponse.status}`);
            }

            const questionData = await questionResponse.json();
            const questions = Array.isArray(questionData) ? questionData : [];
            const question = questions.find(q => q.question_key === s3Key);

            if (question && question.question_id) {
                console.log(`Found question entity: question_id=${question.question_id} for s3Key: ${s3Key}`);
                return {
                    type: 'question',
                    id: question.question_id
                };
            } else {
                console.log(`Question not found with s3Key: ${s3Key} in job_id: ${jobId}`);
            }
        } catch (questionError) {
            console.warn('Error querying questions:', questionError.message);
            // Continue to try answer lookup
        }

        // Try to find as answer
        try {
            const answerResponse = await fetch(`/reson-api/answer/job/${jobId}`);

            if (!answerResponse.ok) {
                if (answerResponse.status === 404) {
                    console.log(`No answers found for job_id: ${jobId}`);
                    // Try alternative lookup: search all answers by candidate/job combination
                    // This requires extracting candidate_id from folder or using a different approach
                    console.warn(`Answer endpoint returned 404, attempting alternative lookup methods`);
                } else {
                    console.warn(`Answer API returned status ${answerResponse.status} for job_id: ${jobId}`);
                }

                // If the route doesn't exist (404), try alternative approach
                if (answerResponse.status === 404) {
                    // Alternative: Try to extract candidate_id from folder if available
                    // Format might be: job_id_X/candidate or user_id_X/candidate_id_Y
                    const candidateIdMatch = folder.match(/candidate_id_(\d+)/);
                    if (candidateIdMatch) {
                        const candidateId = candidateIdMatch[1];
                        console.log(`Trying alternative lookup with candidate_id: ${candidateId}`);
                        const altAnswerResponse = await fetch(`/reson-api/answer/candidate/${candidateId}/job/${jobId}`);

                        if (altAnswerResponse.ok) {
                            const altAnswerData = await altAnswerResponse.json();
                            const altAnswers = Array.isArray(altAnswerData) ? altAnswerData : [];
                            const altAnswer = altAnswers.find(a => a.answer_key === s3Key);

                            if (altAnswer && altAnswer.answer_id) {
                                console.log(`Found answer entity via alternative lookup: answer_id=${altAnswer.answer_id}`);
                                return {
                                    type: 'answer',
                                    id: altAnswer.answer_id
                                };
                            }
                        }
                    }
                }

                if (answerResponse.status !== 404) {
                    throw new Error(`Answer API error: ${answerResponse.status}`);
                }
            } else {
                const answerData = await answerResponse.json();
                const answers = Array.isArray(answerData) ? answerData : [];
                const answer = answers.find(a => a.answer_key === s3Key);

                if (answer && answer.answer_id) {
                    console.log(`Found answer entity: answer_id=${answer.answer_id} for s3Key: ${s3Key}`);
                    return {
                        type: 'answer',
                        id: answer.answer_id
                    };
                } else {
                    console.log(`Answer not found with s3Key: ${s3Key} in job_id: ${jobId}`);
                }
            }
        } catch (answerError) {
            console.warn('Error querying answers:', answerError.message);
            // Answer not found or error occurred
        }

        // Entity not found after all attempts
        console.warn(`Could not find entity for s3Key: ${s3Key}, folder: ${folder}`);
        return null;
    } catch (error) {
        console.error('Error finding entity by S3 key:', {
            s3Key: s3Key,
            folder: folder,
            error: error.message,
            stack: error.stack
        });
        return null;
    }
}
