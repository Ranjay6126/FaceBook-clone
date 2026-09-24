const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const os = require("os");
const fs = require("fs");

const envPaths = [
  path.resolve(__dirname, ".env"),
  path.resolve(__dirname, "..", ".env"),
];
for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: false });
  }
}
dotenv.config();

function buildMongoUrl() {
  if (process.env.MONGO_URL) return process.env.MONGO_URL;
  const user = process.env.MONGO_USER;
  const pass = process.env.MONGO_PASSWORD;
  const host = process.env.MONGO_HOST || "cluster0.ip4otym.mongodb.net";
  const dbName = process.env.MONGO_DB_NAME || "facebook-clone";
  if (user && pass) {
    return `mongodb+srv://${user}:${encodeURIComponent(pass)}@${host}/${dbName}?retryWrites=true&w=majority&appName=Cluster0`;
  }
  return null;
}

const MONGO_URL = buildMongoUrl();

const IS_VERCEL = process.env.VERCEL === "1" || process.env.VERCEL_ENV !== undefined || process.env.VERCEL_URL !== undefined;

const UPLOAD_DIR = IS_VERCEL
  ? path.join(os.tmpdir(), "facebook-clone-images")
  : path.join(__dirname, "public", "images");

try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
} catch (e) {
  console.warn("Could not create upload dir:", e.message);
}

process.env.UPLOAD_DIR = UPLOAD_DIR;

const PORT = process.env.PORT || 8800;

let cachedConnection = null;

async function connectMongo() {
  if (cachedConnection && mongoose.connection.readyState === 1) return cachedConnection;
  if (!MONGO_URL) {
    const msg = "MongoDB configuration missing. Set MONGO_URL or MONGO_USER/MONGO_PASSWORD env vars.";
    console.error(msg);
    throw new Error(msg);
  }
  const opts = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    bufferCommands: false,
  };
  cachedConnection = mongoose.connect(MONGO_URL, opts).then(() => {
    console.log("Connected to MongoDB");
    return mongoose.connection;
  });
  return cachedConnection;
}

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan("common"));
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Upload names are unique, so cache each image at browsers/CDNs after its
// first fetch instead of repeatedly reading it from the function filesystem.
app.use(
  "/images",
  express.static(UPLOAD_DIR, { maxAge: "1y", immutable: true })
);

app.use(async (req, res, next) => {
  if (req.path.startsWith("/images") || req.path === "/api/health") {
    return next();
  }
  try {
    await connectMongo();
    next();
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    res.status(503).json({ message: "Database unavailable. Please check environment configuration." });
  }
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    mongo: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uploadDir: UPLOAD_DIR,
  });
});

const authRoute = require("./routes/auth");
const usersRoute = require("./routes/users");
const postsRoute = require("./routes/posts");
const marketplaceRoute = require("./routes/marketplace");
const messagesRoute = require("./routes/messages");
const notificationsRoute = require("./routes/notifications");
const callsRoute = require("./routes/calls");
const storiesRoute = require("./routes/stories");

app.use("/api/auth", authRoute);
app.use("/api/users", usersRoute);
app.use("/api/posts", postsRoute);
app.use("/api/marketplace", marketplaceRoute);
app.use("/api/messages", messagesRoute);
app.use("/api/notifications", notificationsRoute);
app.use("/api/calls", callsRoute);
app.use("/api/stories", storiesRoute);

const CLIENT_DIST = path.resolve(__dirname, "..", "client", "dist");
if (fs.existsSync(CLIENT_DIST)) {
  app.use(express.static(CLIENT_DIST));
  app.use((req, res, next) => {
    if (
      req.method !== "GET" ||
      req.path.startsWith("/api/") ||
      req.path === "/api" ||
      req.path.startsWith("/images/")
    ) {
      return next();
    }
    return res.sendFile(path.join(CLIENT_DIST, "index.html"));
  });
}

if (require.main === module) {
  if (!MONGO_URL) {
    console.error("MONGO_URL is missing. Add it to server/.env");
    process.exit(1);
  }
  connectMongo()
    .then(() => {
      app.listen(PORT, () => console.log("Server running on port " + PORT));
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = app;
