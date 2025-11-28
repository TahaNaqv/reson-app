import S3 from 'aws-sdk/clients/s3'
import { randomUUID } from "crypto";

export default async function handler(req, res) {
    try {
        // Validate required query parameters
        if (!req.query.fileType) {
            return res.status(400).json({
                error: 'fileType parameter is required'
            });
        }

        if (!req.query.folder) {
            return res.status(400).json({
                error: 'folder parameter is required'
            });
        }

        // Validate required environment variables
        if (!process.env.REGION || !process.env.ACCESS_KEY || !process.env.SECRET_KEY || !process.env.BUCKET_NAME) {
            console.error('Missing AWS environment variables');
            return res.status(500).json({
                error: 'Server configuration error: AWS credentials not configured'
            });
        }

        const s3 = new S3({
            signatureVersion: 'v4',
            region: process.env.REGION,
            accessKeyId: process.env.ACCESS_KEY,
            secretAccessKey: process.env.SECRET_KEY,
        })

        // Extract file extension from fileType
        const fileTypeParts = req.query.fileType.split("/");
        if (fileTypeParts.length < 2) {
            return res.status(400).json({
                error: 'Invalid fileType format. Expected format: type/subtype'
            });
        }
        const ex = fileTypeParts[1];
        const Key = `${randomUUID()}.${ex}`;

        const s3Params = {
            Bucket: process.env.BUCKET_NAME,
            Key: req.query.folder + '/' + Key,
            Expires: 60,
            ContentType: req.query.fileType,
        };

        const preSignedUrl = await s3.getSignedUrlPromise("putObject", s3Params)

        res.status(200).json({
            "url": preSignedUrl,
            "key": Key
        })
    } catch (error) {
        console.error('Upload API error:', error);
        res.status(500).json({
            error: 'Failed to generate upload URL',
            message: error.message
        });
    }
}