const multer = require("multer");
const path = require("path");
const fs = require("fs");

const IMAGES_DIR =
  process.env.UPLOAD_DIR || path.join(__dirname, "..", "public", "images");

try {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
} catch (e) {
  console.warn("Could not create upload dir:", e.message);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, IMAGES_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || "").toLowerCase();
    const base =
      path.basename(file.originalname, ext).replace(/[^a-z0-9_-]/gi, "") ||
      "photo";
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  if (/^(image|video)\//.test(file.mimetype)) cb(null, true);
  else cb(new Error("Only image or video files are allowed"));
};

module.exports = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});