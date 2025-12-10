import { TranscribeClient, DeleteTranscriptionJobCommand } from "@aws-sdk/client-transcribe";
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

    console.log('Deleting transcription job:', Key.jobName);

    const command = new DeleteTranscriptionJobCommand(clientParams);

    try {
        const response = await client.send(command);
        console.log('Transcription job deleted successfully:', Key.jobName);

        return res.status(200).json({
            status: 'true',
            message: 'Job deleted successfully'
        });
    } catch (err) {
        console.error('Error deleting transcription job:', {
            name: err.name,
            message: err.message,
            code: err.$metadata?.httpStatusCode
        });

        // Determine appropriate status code
        let statusCode = 500;
        if (err.name === 'NotFoundException') {
            statusCode = 404;
        } else if (err.name === 'BadRequestException') {
            statusCode = 400;
        }

        const errorMessage = getTranscriptionErrorMessage(err);

        return res.status(statusCode).json({
            status: 'false',
            message: errorMessage || 'Failed to delete the job',
            error: err.name || 'Unknown error',
            details: err.message,
            response: err.$metadata || err
        });
    }
}
