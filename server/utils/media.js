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

module.exports = { getMediaBucket, saveUploadedMedia, BUCKET_NAME };
