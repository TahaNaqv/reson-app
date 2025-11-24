import { TranscribeClient, StartTranscriptionJobCommand } from "@aws-sdk/client-transcribe";

export default async function handler(req,res) {
    const client = new TranscribeClient ({
        region: process.env.REGION,
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_KEY,
    });

    const Key = req.query;

    console.log(client);

    const clientParams = {
        LanguageCode: "en-US",
        TranscriptionJobName: Key.jobName,
        Media: {
            MediaFileUri: Key.media,
        },
        MediaFormat: "mp4",
        OutputBucketName: process.env.BUCKET_NAME,
        OutputKey: Key.outputBucket + '/' + Key.jobName + '.json',
    };

    console.log(clientParams, 'transcribe')

    const command = new StartTranscriptionJobCommand(clientParams);

    try {
        const response = await client.send(command);
        console.log('response', response)
        res.status(200).json({
            "status": 'true',
            "message": 'Job created successfully',
            "response": response
        })
      } catch (err) {
        console.log(err)
        res.status(200).json({
            "status": 'false',
            "message": 'Failed to create a job',
            "response": err
        })
      }
}