import S3 from 'aws-sdk/clients/s3'
import { randomUUID } from "crypto";

export default async function handler(req,res) {
    const s3 = new S3({
        signatureVersion: 'v4',
        region: process.env.REGION,
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_KEY,
    })

    const ex = (req.query.fileType).split("/")[1];
    const Key = `${randomUUID()}.${ex}`;

    const s3Params = {
        Bucket: process.env.BUCKET_NAME,
        Key: req.query.folder + '/' + Key,
        Expires: 60,
        ContentType: req.query.fileType,
    };
// console.log(s3Params)
    const preSignedUrl = await s3.getSignedUrlPromise("putObject", s3Params)

    res.status(200).json({
        "url": preSignedUrl,
        "key": Key
    })
}