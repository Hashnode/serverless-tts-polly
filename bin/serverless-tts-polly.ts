#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ServerlessTtsPollyStack } from '../lib/serverless-tts-polly-stack';

const app = new cdk.App();
new ServerlessTtsPollyStack(app, 'ServerlessTtsPollyStack', {});