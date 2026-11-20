import { CreateBucketCommand, HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

const { CHAT_S3_ENDPOINT, CHAT_S3_BUCKET, CHAT_S3_ACCESS_KEY, CHAT_S3_SECRET_KEY } = process.env;
if (!/^http:\/\/127\.0\.0\.1:\d+$/u.test(CHAT_S3_ENDPOINT ?? '') || CHAT_S3_BUCKET !== 'mushroom-communications') {
  throw new Error('Expected the local communications storage endpoint');
}
const client = new S3Client({
  endpoint: CHAT_S3_ENDPOINT, forcePathStyle: true, region: 'us-east-1',
  credentials: { accessKeyId: CHAT_S3_ACCESS_KEY, secretAccessKey: CHAT_S3_SECRET_KEY },
});
try {
  await client.send(new HeadBucketCommand({ Bucket: CHAT_S3_BUCKET }));
} catch (error) {
  if (error.$metadata?.httpStatusCode !== 404) throw error;
  await client.send(new CreateBucketCommand({ Bucket: CHAT_S3_BUCKET }));
} finally {
  client.destroy();
}
