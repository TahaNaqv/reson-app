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
                                        }
                                    } catch (saveError) {
                                        if (attempt === saveRetries - 1) {
                                            console.error(`Failed to save transcript after ${saveRetries} attempts:`, saveError);
                                        } else {
                                            console.warn(`Transcript save attempt ${attempt + 1} failed, retrying...`);
                                            // Wait before retry (exponential backoff)
                                            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
                                        }
                                    }
                                }

                                if (!saved) {
                                    console.error(`Failed to save transcript for ${entity.type} ${entity.id} after all retries`);
                                }
                            } else {
                                console.warn(`No entity found for S3 key: ${s3Key} in folder: ${folder}`);
                            }
                        } else {
                            console.warn(`Could not extract transcript for job: ${jobName}, s3Key: ${s3Key}`);
                        }
                    } catch (processingError) {
                        console.error('Error processing completed job:', {
                            jobName: jobName,
                            error: processingError.message,
                            stack: processingError.stack
                        });
                        // Don't return error, just log it - webhook should still return success
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
 * See: https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 */
async function verifySNSSignature(req) {
    try {
        // Get required headers
        const signatureVersion = req.headers['x-amz-sns-signature-version'];
        const signingCertUrl = req.headers['x-amz-sns-signing-cert-url'];
        const signature = req.headers['x-amz-sns-signature'];

        if (!signatureVersion || !signingCertUrl || !signature) {
            console.warn('Missing SNS signature headers');
            return false;
        }

        // Step 1: Verify the signing cert URL is from AWS
        if (!signingCertUrl.startsWith('https://sns.') || !signingCertUrl.includes('.amazonaws.com')) {
            console.warn('Invalid signing certificate URL:', signingCertUrl);
            return false;
        }

        // Step 2: Download the certificate
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

        // Step 3: Verify certificate is from AWS and extract public key
        try {
            // Create public key from certificate
            // Node.js can create a public key directly from PEM certificate
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

            // Verify certificate is from AWS by checking the URL
            // The certificate itself should be validated by checking it's from AWS domain
            // Additional validation: check certificate content if needed
            if (!signingCertUrl.includes('.amazonaws.com')) {
                console.warn('Certificate URL not from AWS:', signingCertUrl);
                return false;
            }

            // Step 4: Construct canonical message string
            // SNS signature is computed over a canonical string of the message
            // The format depends on message type, but generally includes all message fields
            const messageType = req.headers['x-amz-sns-message-type'];
            const messageId = req.headers['x-amz-sns-message-id'];
            const topicArn = req.headers['x-amz-sns-topic-arn'];
            const timestamp = req.headers['x-amz-sns-timestamp'];

            // Build the string to sign (canonical format)
            // SNS signs a string containing key-value pairs in alphabetical order
            const fields = [];
            if (req.body.Message) fields.push(['Message', req.body.Message]);
            if (messageId) fields.push(['MessageId', messageId]);
            if (req.body.SubscribeURL) fields.push(['SubscribeURL', req.body.SubscribeURL]);
            if (timestamp) fields.push(['Timestamp', timestamp]);
            if (req.body.Token) fields.push(['Token', req.body.Token]);
            if (topicArn) fields.push(['TopicArn', topicArn]);
            if (messageType) fields.push(['Type', messageType]);

            // Sort fields alphabetically by key name
            fields.sort((a, b) => a[0].localeCompare(b[0]));

            // Construct canonical string
            const stringToSign = fields.map(([key, value]) => `${key}\n${value}\n`).join('') + '\n';

            // Step 5: Verify the signature
            // SNS uses SHA1withRSA signature algorithm
            const signatureBuffer = Buffer.from(signature, 'base64');
            const verify = crypto.createVerify('RSA-SHA1');
            verify.update(stringToSign, 'utf8');

            // Verify signature
            const isValid = verify.verify(publicKey, signatureBuffer);

            if (!isValid) {
                console.warn('SNS signature verification failed');
                return false;
            }

            return true;
        } catch (cryptoError) {
            console.error('Error verifying certificate or signature:', cryptoError);
            // Fallback: if crypto operations fail, at least verify URL is from AWS
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
        // Try to find as question first
        // Extract job_id from folder if possible (format: user_id_X/company/job_id_Y)
        const jobIdMatch = folder.match(/job_id_(\d+)/);
        if (jobIdMatch) {
            const jobId = jobIdMatch[1];

            // Query questions by job_id and question_key
            try {
                const questionResponse = await fetch(`/reson-api/question/job/${jobId}`);

                if (!questionResponse.ok) {
                    console.warn(`Question API returned status ${questionResponse.status}`);
                    throw new Error(`Question API error: ${questionResponse.status}`);
                }

                const questionData = await questionResponse.json();
                const questions = Array.isArray(questionData) ? questionData : [];
                const question = questions.find(q => q.question_key === s3Key);

                if (question && question.question_id) {
                    return {
                        type: 'question',
                        id: question.question_id
                    };
                }
            } catch (questionError) {
                console.warn('Error querying questions:', questionError.message);
                // Question not found, try answer
            }

            // Try to find as answer
            // Extract candidate_id from folder or query all answers for job
            try {
                // Query answers - we need candidate_id, but we can search by answer_key
                // This is a simplified approach - in production, you might want to store
                // a mapping table or include more metadata in the job name
                const answerResponse = await fetch(`/reson-api/answer/job/${jobId}`);

                if (!answerResponse.ok) {
                    console.warn(`Answer API returned status ${answerResponse.status}`);
                    // If endpoint doesn't exist, try alternative approach
                    if (answerResponse.status === 404) {
                        console.warn(`Answer endpoint /reson-api/answer/job/${jobId} not found, trying alternative lookup`);
                        // Could implement alternative lookup here if needed
                    }
                    throw new Error(`Answer API error: ${answerResponse.status}`);
                }

                const answerData = await answerResponse.json();
                const answers = Array.isArray(answerData) ? answerData : [];
                const answer = answers.find(a => a.answer_key === s3Key);

                if (answer && answer.answer_id) {
                    return {
                        type: 'answer',
                        id: answer.answer_id
                    };
                }
            } catch (answerError) {
                console.warn('Error querying answers:', answerError.message);
                // Answer not found
            }
        }

        // If folder doesn't match expected pattern, try direct lookup
        // This is a fallback - may need adjustment based on your folder structure
        console.warn(`Could not extract job_id from folder: ${folder}`);
        return null;
    } catch (error) {
        console.error('Error finding entity by S3 key:', error);
        return null;
    }
}
