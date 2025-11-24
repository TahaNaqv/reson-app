import { TranscribeStreamingClient, StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
import { S3RequestPresigner } from "@aws-sdk/s3-request-presigner";
import { Sha256 } from "@aws-crypto/sha256-browser";

export default async function handler(req,res) {
    const awsEndpoint = 'transcribestreaming.' + process.env.REGION + '.amazonaws.com:8443';
    const hash = new Sha256();
    const raw = {
      method: 'GET',
      host: awsEndpoint,
      path: '/stream-transcription',
      service: 'transcribe',
      payload: hash.update('', 'utf8'),
      options: {
        key: process.env.ACCESS_KEY,
        secret: process.env.SECRET_KEY,
        region: process.env.REGION,
        protocol: 'wss',
        expires: 300,
        query: 'language-code=en-US&media-encoding=pcm&sample-rate=44100',
      },
    }

    console.log(`https://${awsEndpoint}`);
    const response = await fetch(`https://${awsEndpoint}`, raw);
    console.log(await response.json());
    return response
    // const client = new TranscribeStreamingClient ({
    //     endpoint: awsEndpoint,
    //     credentials: {
    //       region: process.env.REGION,
    //       accessKeyId: process.env.ACCESS_KEY,
    //       secretAccessKey: process.env.SECRET_KEY,
    //     },
    //     signer: () => {
    //       return {
    //         presign: () => {
    //           return Promise.resolve({ protocol: "wss", hostname: "", path: url.slice(5) })
    //         },
    //       }
    //     }
    // });

    // console.log(client);

    

    // const Key = req.query.audio;
    // console.log(Key)

    // const clientParams = {
    //     LanguageCode: "en-US",
    //     MediaEncoding: "pcm",
    //     MediaSampleRateHertz: "16000",
    //     AudioStream: (async function* () {
    //         for await (const chunk of Key) {
    //           yield {AudioEvent: {AudioChunk: chunk}};
    //         }
    //       })(),
    // };

    // console.log(clientParams)

    // const command = new StartStreamTranscriptionCommand(clientParams);

    // try {
    //     const response = await client.send(command);
    //     console.log('response', response)
    //     for await (const event of response.TranscriptResultStream) {
    //         console.log('event', event);
    //         // console.log(JSON.stringify(event));
    //     }
    //     // res.status(200).json({
    //     //     "status": 'Old video deleted successfully',
    //     //     "response": response
    //     // })
    //   } catch (err) {
    //     console.log(err)
    //     res.status(200).json({
    //         "status": 'Stream Failed',
    //         "response": err
    //     })
    //   }
    // // const awsEndpoint = 'transcribestreaming.' + process.env.REGION + '.amazonaws.com:8443';
    // // const preSignedUrl = await getSignedUrlPromise("GET", awsEndpoint, clientParams, 'transcribe', client)

    // // res.status(200).json({
    // //     "url": preSignedUrl,
    // //     "key": Key
    // // })

    // // console.log(url);

}