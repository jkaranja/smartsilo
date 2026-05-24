import { Storage } from "@google-cloud/storage";
import { getGCPConfig } from "./init";

export const getStorageBucket = () => {
  const config = getGCPConfig();

  let storage = new Storage({
    projectId: config.credentials.project_id,
    credentials: config.credentials,
  });

  return storage.bucket(config.storageBucket);
};

export const uploadFile = async ({
  buffer,
  key,
  contentType = "image/webp",
}: {
  buffer: Buffer;
  key: string;
  contentType?: string;
}) => {
  try {
    console.info(`Uploading file: ${key}`);

    const bucket = getStorageBucket();

    const file = bucket.file(key);

    await file.save(buffer, {
      resumable: false,
      contentType,
      metadata: { cacheControl: "public, max-age=31536000" },
    });
  } catch (e) {
    console.error(e);
  }
};

export const deleteFilesByPrefix = async (
  prefix: string | undefined | null,
) => {
  if (!prefix) {
    console.log(`prefix not provided`);
    return;
  }

  const config = getGCPConfig();

  try {
    const bucket = getStorageBucket();

    // List all files in the bucket with the given prefix (anything after bucket name and before filename)
    const [files] = await bucket.getFiles({ prefix });

    if (files.length === 0) {
      console.warn(
        `No files found in bucket '${config.storageBucket}' with prefix '${prefix}'`,
      );
      return;
    }

    // Delete all files in parallel
    await Promise.all(
      files.map(async (file) => {
        try {
          await file.delete();
          console.info(`Deleted file: ${file.name}`);
        } catch (err: any) {
          console.error(`Failed to delete file ${file.name}:`, err);
        }
      }),
    );

    console.info(
      `All files with prefix '${prefix}' deleted from bucket '${config.storageBucket}'`,
    );
  } catch (err) {
    console.error("Failed to delete files by prefix:", err);
    return;
  }
};

export const downloadFileByKey = async (key: string): Promise<Buffer> => {
  const bucket = getStorageBucket();
  const [buffer] = await bucket.file(key).download();
  return buffer;
};

// key: full GCS object path without bucket name (e.g. learning-areas/{learningAreaId}/exams/{examId}/{questionNumber}/{filename}.ext)
export const deleteFileByKey = async (key: string | undefined | null) => {
  if (!key) {
    console.log(`key not provided`);
    return;
  }

  const config = getGCPConfig();

  try {
    const bucket = getStorageBucket();
    const file = bucket.file(key);

    try {
      await file.delete();
      console.info(
        `File deleted from bucket '${config.storageBucket}': ${key}`,
      );
    } catch (error: any) {
      if (error.code === 404) {
        console.warn(
          `File not found in bucket '${config.storageBucket}': ${key}`,
        );
        return;
      } else {
        console.error("Error deleting file:", error);
        return;
      }
    }
  } catch (err) {
    console.error("Failed to delete file by key:", err);
    return;
  }
};

// key: full GCS object path without bucket name
export const toGCSUrl = (key: string) => {
  const bucketName = getStorageBucket().name;
  return `https://storage.googleapis.com/${bucketName}/${key}`;
};

// subpath: path segments without bucket and without filename
//   e.g. learning-areas/{learningAreaId}/exams/{examId}/{questionNumber}
// returns full GCS object key: {subpath}/{filename}_{timestamp}.{ext}
export const getStorageKey = ({
  subpath,
  filepart,
  ext = "webp",
}: {
  subpath: string;
  filepart: string;
  ext?: string;
}) => {
  const timestamp = Date.now(); // milliseconds since epoch

  const filename = `${filepart}_${timestamp}.${ext}`;
  return {
    key: `${subpath}/${filename}`,
    filename,
  };
};
