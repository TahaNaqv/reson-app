import S3 from 'aws-sdk/clients/s3'
import { randomUUID } from "crypto";

export default async function handler(req,res) {
    // Validate required query parameters
    if (!req.query.key || !req.query.folder) {
        return res.status(400).json({
            error: 'Missing required parameters: key and folder'
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

    const Key = req.query.key;

    const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: req.query.folder + '/' + Key,
        Expires: 6000,
    };

    console.log('Generating download URL', {
        bucket: process.env.BUCKET_NAME,
        key: s3Params.Key,
        expires: s3Params.Expires
    });

    const preSignedUrl = await s3.getSignedUrlPromise("getObject", s3Params)

    res.status(200).json({
        "durl": preSignedUrl,
        "dkey": Key
    })
}