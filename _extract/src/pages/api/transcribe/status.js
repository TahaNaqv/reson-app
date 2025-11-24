import { TranscribeClient, GetTranscriptionJobCommand } from "@aws-sdk/client-transcribe";

export default async function handler(req,res) {
    const client = new TranscribeClient ({
        region: process.env.REGION,
        accessKeyId: process.env.ACCESS_KEY,
        secretAccessKey: process.env.SECRET_KEY,
    });

    const Key = req.query;

    const clientParams = {
        TranscriptionJobName: Key.jobName,
    };

    console.log(clientParams)

    const command = new GetTranscriptionJobCommand(clientParams);

    try {
        const response = await client.send(command);
        console.log('response', response)
        res.status(200).json({
            response
        })
      } catch (err) {
        console.log(err)
        res.status(200).json({
            "status": 'false',
            "message": 'Failed to create a job',
            "response": err.$metadata
        })
      }
}