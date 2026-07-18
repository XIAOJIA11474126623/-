import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let s3Client: S3Client | null = null;

function getRequiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getS3Client(): S3Client {
  s3Client ??= new S3Client({
    region: "auto",
    endpoint: getRequiredEnv("R2_ENDPOINT"),
    credentials: {
      accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
      secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    },
  });

  return s3Client;
}

export async function uploadToR2(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string,
): Promise<string> {
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getRequiredEnv("R2_BUCKET_NAME"),
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType,
    }),
  );

  return `${getRequiredEnv("R2_PUBLIC_URL")}/${fileName}`;
}

export function getR2ObjectKeyFromPublicUrl(imageUrl: string): string | null {
  const publicUrl = new URL(getRequiredEnv("R2_PUBLIC_URL"));
  const parsedUrl = new URL(imageUrl);

  if (parsedUrl.origin !== publicUrl.origin) {
    return null;
  }

  return decodeURIComponent(parsedUrl.pathname.replace(/^\/+/, ""));
}

export async function getR2Object(fileName: string): Promise<{
  body: Uint8Array;
  contentType: string;
}> {
  const object = await getS3Client().send(
    new GetObjectCommand({
      Bucket: getRequiredEnv("R2_BUCKET_NAME"),
      Key: fileName,
    }),
  );

  if (!object.Body) {
    throw new Error("R2 object body is empty");
  }

  const body = await object.Body.transformToByteArray();

  return {
    body,
    contentType: object.ContentType || "application/octet-stream",
  };
}
