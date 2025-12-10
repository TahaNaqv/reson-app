import { TranscribeClient, StartTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { TRANSCRIPTION_CONFIG, SUPPORTED_MEDIA_FORMATS } from "@/config/transcription";
import { generateUniqueJobName, getTranscriptionErrorMessage } from "@/utils/transcription";

// Convert HTTPS URL to S3 URI format
function convertToS3Uri(httpsUrl, bucketName) {
    if (!httpsUrl || !bucketName) {
        throw new Error('Invalid URL or bucket name');
    }

    // If already in S3 URI format, return as-is
    if (httpsUrl.startsWith('s3://')) {
        return httpsUrl;
    }

    // Extract path from HTTPS URL
    // Format: https://bucket.s3.region.amazonaws.com/path or https://bucket.s3.amazonaws.com/path
    try {
        const url = new URL(httpsUrl);
        const path = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        return `s3://${bucketName}/${path}`;
    } catch (error) {
        throw new Error(`Invalid URL format: ${httpsUrl}`);
    }
}

// Normalize path - remove leading/trailing slashes and ensure single separators
function normalizePath(...parts) {
    return parts
        .filter(part => part && typeof part === 'string') // Remove empty/null parts
        .map(part => part.replace(/^\/+|\/+$/g, '')) // Remove leading/trailing slashes
        .join('/');
}

// Detect media format from file extension
function detectMediaFormat(jobName) {
    if (!jobName) return 'mp4'; // Default

    const ext = jobName.split('.').pop()?.toLowerCase();
    return SUPPORTED_MEDIA_FORMATS[ext] || 'mp4'; // Default to mp4
}

export default async function handler(req, res) {
    // Validate environment variables
    if (!process.env.REGION || !process.env.ACCESS_KEY || !process.env.SECRET_KEY || !process.env.BUCKET_NAME) {
        console.error('Missing AWS environment variables:', {
            hasRegion: !!process.env.REGION,
            hasAccessKey: !!process.env.ACCESS_KEY,
            hasSecretKey: !!process.env.SECRET_KEY,
            hasBucket: !!process.env.BUCKET_NAME
        });
        return res.status(500).json({
            status: 'false',
            message: 'AWS credentials not configured',
            error: 'Missing required environment variables'
        });
    }

    const Key = req.query;

    // Validate required parameters
    const missingParams = [];
    if (!Key.jobName) missingParams.push('jobName');
    if (!Key.media) missingParams.push('media');
    if (!Key.outputBucket) missingParams.push('outputBucket');

    if (missingParams.length > 0) {
        return res.status(400).json({
            status: 'false',
            message: 'Missing required parameters',
            error: `Missing: ${missingParams.join(', ')}`,
            required: ['jobName', 'media', 'outputBucket']
        });
    }

    // Validate jobName format (AWS has restrictions)
    if (!/^[a-zA-Z0-9._-]+$/.test(Key.jobName)) {
        return res.status(400).json({
            status: 'false',
            message: 'Invalid job name format',
            error: 'Job name can only contain letters, numbers, dots, underscores, and hyphens'
        });
    }

    // Configure TranscribeClient with explicit credentials
    const client = new TranscribeClient({
        region: process.env.REGION,
        credentials: {
            accessKeyId: process.env.ACCESS_KEY,
            secretAccessKey: process.env.SECRET_KEY,
        },
    });

    try {
        // Convert HTTPS URL to S3 URI format
        const s3MediaUri = convertToS3Uri(Key.media, process.env.BUCKET_NAME);

        // Generate unique job name to prevent collisions
        // Use the original key as base but add uniqueness
        const baseKey = Key.jobName.replace(/[^a-zA-Z0-9._-]/g, '_');
        const jobName = generateUniqueJobName(baseKey);

        // Detect media format
        const mediaFormat = Key.mediaFormat || detectMediaFormat(Key.jobName);

        // Get language code from query param or use default
        const languageCode = Key.languageCode || TRANSCRIPTION_CONFIG.DEFAULT_LANGUAGE;

        // Normalize output key path (use original key for output, not the unique job name)
        const outputKey = normalizePath(Key.outputBucket, Key.jobName + '.json');

        const clientParams = {
            LanguageCode: languageCode,
            TranscriptionJobName: jobName,
            Media: {
                MediaFileUri: s3MediaUri,
            },
            MediaFormat: mediaFormat,
            OutputBucketName: process.env.BUCKET_NAME,
            OutputKey: outputKey,
        };

        console.log('Transcription params:', {
            jobName: jobName,
            mediaUri: s3MediaUri,
            mediaFormat: mediaFormat,
            languageCode: languageCode,
            outputKey: outputKey
        });

        const command = new StartTranscriptionJobCommand(clientParams);

        const response = await client.send(command);
        console.log('Transcription job started successfully:', {
            jobName: response.TranscriptionJob?.TranscriptionJobName,
            status: response.TranscriptionJob?.TranscriptionJobStatus
        });

        return res.status(200).json({
            status: 'true',
            message: 'Job created successfully',
            response: {
                jobName: response.TranscriptionJob?.TranscriptionJobName,
                status: response.TranscriptionJob?.TranscriptionJobStatus
            }
        });
    } catch (err) {
        console.error('Transcription error:', {
            name: err.name,
            message: err.message,
            code: err.$metadata?.httpStatusCode,
            requestId: err.$metadata?.requestId
        });

        // Determine appropriate status code
        let statusCode = 500;
        if (err.name === 'ValidationException' || err.name === 'BadRequestException') {
            statusCode = 400;
        } else if (err.name === 'AccessDeniedException' || err.name === 'UnauthorizedOperation') {
            statusCode = 403;
        } else if (err.name === 'ConflictException') {
            statusCode = 409;
        }

        const errorMessage = getTranscriptionErrorMessage(err);

        return res.status(statusCode).json({
            status: 'false',
            message: errorMessage || 'Failed to create transcription job',
            error: err.name || 'Unknown error',
            details: err.message,
            code: err.$metadata?.httpStatusCode
        });
    }
}
