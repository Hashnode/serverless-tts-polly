import {
  aws_iam,
  aws_s3,
  aws_sqs,
  Duration,
  Stack,
  StackProps,
} from "aws-cdk-lib";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import * as path from "path";

export class ServerlessTtsPollyStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);
    const queue = new aws_sqs.Queue(this, "PollyQueue");
    const bucket = new aws_s3.Bucket(this, "GeneratedAudio");

    const lambda = new NodejsFunction(this, `tts-polly`, {
      memorySize: 1024,
      timeout: Duration.seconds(15),
      handler: "main",
      entry: path.join(`./functions/audio/index.ts`),
      environment: {
        bucketAudioBlogs: bucket.bucketName,
      },
    });

    lambda.addToRolePolicy(
      new aws_iam.PolicyStatement({ actions: ["polly:*"], resources: ["*"] })
    );

    lambda.addEventSource(new SqsEventSource(queue, { batchSize: 10 }));
    bucket.grantPublicAccess();

    bucket.grantReadWrite(lambda);
  }
}
