const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const helmet = require("helmet");
const morgan = require("morgan");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

dotenv.config();

if (!process.env.MONGO_URL) {
  console.error("MONGO_URL is missing. Add it to server/.env");
  process.exit(1);
}

const app = express();

app.use(express.json());
// Allow photos served from /images to be embedded on the React dev origin
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(morgan("common"));
app.use(cors());

// Serve uploaded photos
const IMAGES_DIR = path.join(__dirname, "public", "images");
fs.mkdirSync(IMAGES_DIR, { recursive: true });
app.use("/images", express.static(IMAGES_DIR));

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

app.get("/api/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

// In production Render serves the compiled React app from this same service.
// Keeping the UI and API on one origin avoids CORS configuration and makes
// relative uploaded-media URLs work after deployment.
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

const PORT = process.env.PORT || 8800;

mongoose
  .connect(process.env.MONGO_URL)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log("Server running on port " + PORT));
  })
  .catch((err) => console.error(err));
