import { TranscribeClient, ListTranscriptionJobsCommand, DeleteTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { TRANSCRIPTION_CONFIG } from "@/config/transcription";

/**
 * Cleanup endpoint for old transcription jobs
 * Deletes completed or failed jobs older than configured days
 * Can be called manually or scheduled via cron
 * 
 * SECURITY: Requires API key authentication via X-API-Key header or apiKey in request body
 * Set TRANSCRIPTION_CLEANUP_API_KEY environment variable to enable authentication
 */
export default async function handler(req, res) {
    // Only allow POST requests for cleanup (security)
    if (req.method !== 'POST') {
        return res.status(405).json({
            status: 'false',
            message: 'Method not allowed. Use POST to trigger cleanup.'
        });
    }

    // Authentication: Check for API key if configured
    const requiredApiKey = process.env.TRANSCRIPTION_CLEANUP_API_KEY;
    if (requiredApiKey) {
        const providedApiKey = req.headers['x-api-key'] || req.body?.apiKey;

        if (!providedApiKey) {
            console.warn('Cleanup endpoint accessed without API key');
            return res.status(401).json({
                status: 'false',
                message: 'Unauthorized. API key required.',
                error: 'Missing X-API-Key header or apiKey in request body'
            });
        }

        if (providedApiKey !== requiredApiKey) {
            console.warn('Cleanup endpoint accessed with invalid API key');
            return res.status(403).json({
                status: 'false',
                message: 'Forbidden. Invalid API key.',
                error: 'API key authentication failed'
            });
        }

        console.log('Cleanup endpoint accessed with valid API key');
    } else {
        console.warn('Cleanup endpoint accessed without API key protection. Set TRANSCRIPTION_CLEANUP_API_KEY environment variable.');
    }

    // Validate environment variables
    if (!process.env.REGION || !process.env.ACCESS_KEY || !process.env.SECRET_KEY) {
        console.error('Missing AWS environment variables');
        return res.status(500).json({
            status: 'false',
            message: 'AWS credentials not configured',
            error: 'Missing required environment variables'
        });
    }

    // Configure TranscribeClient
    const client = new TranscribeClient({
        region: process.env.REGION,
        credentials: {
            accessKeyId: process.env.ACCESS_KEY,
            secretAccessKey: process.env.SECRET_KEY,
        },
    });

    const cleanupDays = req.body?.days || TRANSCRIPTION_CONFIG.CLEANUP_DAYS;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cleanupDays);

    let deletedCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
        // List all transcription jobs
        // Note: AWS Transcribe ListTranscriptionJobs has pagination
        // Create new command instances for each pagination iteration
        let nextToken = null;
        let hasMore = true;

        while (hasMore) {
            // Create new command instance for each iteration (required for AWS SDK v3)
            const listCommand = new ListTranscriptionJobsCommand({
                MaxResults: 100, // AWS max is 100
                Status: 'COMPLETED', // Can also include 'FAILED'
                NextToken: nextToken || undefined // Only include if we have a token
            });

            const listResponse = await client.send(listCommand);
            const jobs = listResponse.TranscriptionJobSummaries || [];

            for (const job of jobs) {
                try {
                    // Check if job is older than cutoff date
                    const completionTime = job.CompletionTime
                        ? new Date(job.CompletionTime)
                        : job.CreationTime
                            ? new Date(job.CreationTime)
                            : null;

                    if (completionTime && completionTime < cutoffDate) {
                        // Delete the old job
                        const deleteCommand = new DeleteTranscriptionJobCommand({
                            TranscriptionJobName: job.TranscriptionJobName
                        });

                        await client.send(deleteCommand);
                        deletedCount++;
                        console.log(`Deleted old transcription job: ${job.TranscriptionJobName}`);
                    }
                } catch (deleteError) {
                    errorCount++;
                    errors.push({
                        jobName: job.TranscriptionJobName,
                        error: deleteError.message
                    });
                    console.error(`Error deleting job ${job.TranscriptionJobName}:`, deleteError);
                }
            }

            // Check if there are more jobs to process
            nextToken = listResponse.NextToken;
            hasMore = !!nextToken;
        }

        // Also clean up failed jobs
        nextToken = null;
        hasMore = true;

        while (hasMore) {
            // Create new command instance for each iteration (required for AWS SDK v3)
            const failedListCommand = new ListTranscriptionJobsCommand({
                MaxResults: 100,
                Status: 'FAILED',
                NextToken: nextToken || undefined // Only include if we have a token
            });

            const failedListResponse = await client.send(failedListCommand);
            const failedJobs = failedListResponse.TranscriptionJobSummaries || [];

            for (const job of failedJobs) {
                try {
                    const failureTime = job.FailureTime
                        ? new Date(job.FailureTime)
                        : job.CreationTime
                            ? new Date(job.CreationTime)
                            : null;

                    if (failureTime && failureTime < cutoffDate) {
                        const deleteCommand = new DeleteTranscriptionJobCommand({
                            TranscriptionJobName: job.TranscriptionJobName
                        });

                        await client.send(deleteCommand);
                        deletedCount++;
                        console.log(`Deleted old failed transcription job: ${job.TranscriptionJobName}`);
                    }
                } catch (deleteError) {
                    errorCount++;
                    errors.push({
                        jobName: job.TranscriptionJobName,
                        error: deleteError.message
                    });
                    console.error(`Error deleting failed job ${job.TranscriptionJobName}:`, deleteError);
                }
            }

            nextToken = failedListResponse.NextToken;
            hasMore = !!nextToken;
        }

        // Log cleanup operation for audit trail
        console.log('Cleanup operation completed:', {
            deletedCount: deletedCount,
            errorCount: errorCount,
            cutoffDate: cutoffDate.toISOString(),
            cleanupDays: cleanupDays,
            timestamp: new Date().toISOString()
        });

        return res.status(200).json({
            status: 'true',
            message: 'Cleanup completed',
            deletedCount: deletedCount,
            errorCount: errorCount,
            errors: errors.length > 0 ? errors : undefined,
            cutoffDate: cutoffDate.toISOString(),
            cleanupDays: cleanupDays
        });

    } catch (err) {
        console.error('Error during cleanup:', {
            name: err.name,
            message: err.message,
            code: err.$metadata?.httpStatusCode
        });

        return res.status(500).json({
            status: 'false',
            message: 'Error during cleanup',
            error: err.name || 'Unknown error',
            details: err.message,
            deletedCount: deletedCount,
            errorCount: errorCount
        });
    }
}
