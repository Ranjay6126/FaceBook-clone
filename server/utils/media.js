const crypto = require("crypto");
const mongoose = require("mongoose");
const path = require("path");

const BUCKET_NAME = "media";

function getMediaBucket() {
  if (!mongoose.connection.db) {
    throw new Error("MongoDB is not connected");
  }
  return new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    bucketName: BUCKET_NAME,
  });
}

function safeFilename(originalName) {
  const ext = (path.extname(originalName) || "").toLowerCase();
  const base =
    path.basename(originalName, ext).replace(/[^a-z0-9_-]/gi, "") || "media";
  return `${Date.now()}-${crypto.randomBytes(6).toString("hex")}-${base}${ext}`;
}

function saveUploadedMedia(file, folder = "uploads") {
  if (!file?.buffer) {
    return Promise.reject(new Error("Uploaded file data is missing"));
  }

  const bucket = getMediaBucket();
  const stream = bucket.openUploadStream(safeFilename(file.originalname), {
    metadata: {
      contentType: file.mimetype || "application/octet-stream",
      folder,
    },
  });

  return new Promise((resolve, reject) => {
    stream.once("error", reject);
    stream.once("finish", () => resolve(`/api/media/${stream.id.toString()}`));
    stream.end(file.buffer);
  });
}

async function saveUploadedMediaChunks(chunks, filename, contentType, folder = "uploads") {
  const bucket = getMediaBucket();
  const safeFile = safeFilename(filename);
  const stream = bucket.openUploadStream(safeFile, {
    metadata: { contentType: contentType || "application/octet-stream", folder },
  });
  const completed = new Promise((resolve, reject) => {
    stream.once("error", reject);
    stream.once("finish", () => resolve(`/api/media/${stream.id.toString()}`));
  });

  try {
    for (const chunk of chunks) {
      const data = Buffer.isBuffer(chunk.data)
        ? chunk.data
        : Buffer.from(chunk.data.buffer, 0, chunk.data.position);
      if (!stream.write(data)) {
        await new Promise((resolve, reject) => {
          stream.once("drain", resolve);
          stream.once("error", reject);
        });
      }
    }
    stream.end();
    return await completed;
  } catch (error) {
    stream.destroy(error);
    throw error;
  }
}

module.exports = {
  getMediaBucket,
  saveUploadedMedia,
  saveUploadedMediaChunks,
  BUCKET_NAME,
};
