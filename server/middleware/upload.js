const multer = require("multer");
const fileFilter = (req, file, cb) => {
  if (/^(image|video)\//.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image or video files are allowed"));
};

module.exports = multer({
  // Keep the upload in memory until it can be sent to durable media storage.
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});
