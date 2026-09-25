const multer = require("multer");
const fileFilter = (req, file, cb) => {
  // Browsers and proxies can label multipart chunks as generic binary. The
  // authenticated upload session validates the declared media type before
  // accepting the assembled file.
  const isMediaChunk = /\/(?:reel-upload|upload)\/[^/]+\/chunk\/\d+$/.test(req.path);
  if (/^(image|video)\//.test(file.mimetype) || (isMediaChunk && file.mimetype === "application/octet-stream")) cb(null, true);
  else cb(new Error("Only image or video files are allowed"));
};

module.exports = multer({
  // Keep the upload in memory until it can be sent to durable media storage.
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});
