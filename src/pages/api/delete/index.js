import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

export default async function handler(req,res) {
    // const client = new S3Client(config);
    const client = new S3Client ({
        signatureVersion: 'v4',
        region: process.env.REGION,
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_KEY,
    })

    const Key = req.query.file;

    const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: req.query.folder + '/' + Key,
    };

    const command = new DeleteObjectCommand(s3Params);

    try {
        const response = await client.send(command);
        res.status(200).json({
            "status": 'Old file deleted successfully',
            "response": response
        })
      } catch (err) {
        res.status(200).json({
            "status": 'File not found or failed to delete old file',
            "response": err
        })
      }

}