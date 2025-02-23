import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'node:stream';

const s3Client = new S3Client();

export async function saveAssoc(contract, chainId, pkgName) {
  // save pkgName association in s3 blob/assoc/<address>.json {[chainid]: "<pkgname>"}
  await transformS3Json(process.env.ASSOC_BUCKET, `assoc/${contract.toLowerCase()}.json`, data => {
    if(chainId in data)
      throw new Error('already_verified');
    data[chainId] = pkgName;
    return data;
  });

  // maintain list of newest n verifiers
  // make a new file that is then aggregated by a separate lambda on a timer
  // into latest.json so that multiple verifications can occur simultaneously
  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.ASSOC_BUCKET,
    Key:`latest-queue/${chainId}-${contract}.json`,
    ContentType: 'application/json',
    Body: JSON.stringify({
      chain: chainId,
      address: contract,
      pkgName: pkgName,
      createdAt: Math.floor(Date.now() / 1000),
    }),
  }));
}

export async function transformS3Json(bucketName, key, transformCallback) {
  // Load the existing JSON file from S3
  const getObjectParams = {
      Bucket: bucketName,
      Key: key,
  };

  let jsonData;

  try {
      const data = await s3Client.send(new GetObjectCommand(getObjectParams));
      // Convert stream to string
      const jsonString = await streamToString(data.Body);
      // Parse the JSON data
      jsonData = JSON.parse(jsonString);
  } catch (error) {
      if (error.name === 'NoSuchKey') {
          jsonData = {};
      } else {
          throw error;
      }
  }

  // Transform the data using the provided callback
  const transformedData = await transformCallback(jsonData);

  // Convert the transformed data back to JSON string
  const transformedJsonString = JSON.stringify(transformedData);

  // Save the new version back to S3
  const putObjectParams = {
      Bucket: bucketName,
      Key: key,
      Body: transformedJsonString,
      ContentType: 'application/json',
  };

  await s3Client.send(new PutObjectCommand(putObjectParams));
}

// Helper function to convert stream to string
function streamToString(stream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
}
