import { SQSEvent } from "aws-lambda";
import Speech from "ssml-builder";
import SSMLSplit from "ssml-split";
import AWS = require("aws-sdk");

const s3 = new AWS.S3();
const polly = new AWS.Polly();
const HASHNODE_INTRO = `This audio blog is powered by Hashnode, which is the easiest way to start a developer blog on a custom domain, and find audience.`;
const BUCKET_NAME = process.env.bucketAudioBlogs!;

export async function main(event: SQSEvent): Promise<any> {
  const records = event.Records;

  return await Promise.all(
    records.map(async (record) => {
      return await handleAudioGenerationAndUpload(record.body);
    })
  );
}

const handleAudioGenerationAndUpload: (
  text: string
) => Promise<string> = async (text) => {
  const speech = new Speech();
  speech.say(HASHNODE_INTRO).pause("1s").say(text);
  const speechOutput = speech.ssml();

  const ssmlSplit = new SSMLSplit({
    synthesizer: "aws",
    softLimit: 1500,
    hardLimit: 1500,
    breakParagraphsAboveHardLimit: true,
  });

  const batches = ssmlSplit.split(speechOutput);

  const audioStreams = await Promise.all(
    batches.map(async (chunk) => {
      try {
        const audio = await _generatePollyAudio(chunk);
        return audio.AudioStream;
      } catch (err) {
        console.error("Error at following chunk: ", chunk);
        console.log("Error: ", err);
      }
    })
  );

  const buffer = Buffer.concat(
    audioStreams,
    audioStreams.reduce((len, a) => len + a.length, 0)
  );
  // This is not meant for a prod use 😜
  const s3Key = String(Math.floor(Math.random() * (100 - 0 + 1)) + 0);
  const response = await _uploadAudioToS3(s3Key, buffer);

  if (!response.ETag) {
    throw response;
  }

  return `https://${BUCKET_NAME}.s3-us-west-1.amazonaws.com/${s3Key}`;
};

const _uploadAudioToS3 = (key, body) =>
  s3
    .putObject({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: "audio/mp3",
    })
    .promise();

export const _generatePollyAudio: (text: string) => any = (text) => {
  const params = {
    Text: text,
    TextType: "ssml",
    OutputFormat: "mp3",
    VoiceId: "Matthew",
  };

  return polly
    .synthesizeSpeech(params)
    .promise()
    .then((audio) => {
      if (audio.AudioStream instanceof Buffer) return audio;
      else throw "AudioStream is not a Buffer.";
    });
};
