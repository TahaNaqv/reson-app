import { TranscribeClient, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
import { getTranscriptionErrorMessage } from "@/utils/transcription";

export default async function handler(req, res) {
    // Validate environment variables
    if (!process.env.REGION || !process.env.ACCESS_KEY || !process.env.SECRET_KEY) {
        console.error('Missing AWS environment variables');
        return res.status(500).json({
            status: 'false',
            message: 'AWS credentials not configured',
            error: 'Missing required environment variables'
        });
    }

    const Key = req.query;

    // Validate required parameters
    if (!Key.jobName) {
        return res.status(400).json({
            status: 'false',
            message: 'Missing required parameter: jobName',
            error: 'Invalid request'
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

    const clientParams = {
        TranscriptionJobName: Key.jobName,
    };

    console.log('Checking transcription status for:', Key.jobName);

    const command = new GetTranscriptionJobCommand(clientParams);

    try {
        const response = await client.send(command);
        console.log('Transcription status retrieved:', {
            jobName: response.TranscriptionJob?.TranscriptionJobName,
            status: response.TranscriptionJob?.TranscriptionJobStatus
        });

        return res.status(200).json({
            response
        });
    } catch (err) {
        console.error('Error getting transcription status:', {
            name: err.name,
            message: err.message,
            code: err.$metadata?.httpStatusCode
        });

        // Determine appropriate status code
        const statusCode = err.name === 'NotFoundException' ? 404 : 500;

        const errorMessage = getTranscriptionErrorMessage(err);

        return res.status(statusCode).json({
            status: 'false',
            message: errorMessage,
            error: err.name || 'Unknown error',
            details: err.message,
            response: err.$metadata
        });
    }
}
