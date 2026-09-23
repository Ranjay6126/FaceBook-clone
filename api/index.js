if (process.env.VERCEL === "1" || process.env.VERCEL_ENV || process.env.VERCEL_URL) {
  process.env.NODE_ENV = process.env.NODE_ENV || "production";
}

const app = require("../server/index.js");

module.exports = app;
