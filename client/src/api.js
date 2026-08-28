import axios from "axios";
import { getUser } from "./utils/storage";

// Locally Vite and Express run on separate ports; deployed builds are served
// by Express, so relative requests keep the API on the Render service origin.
const defaultApiUrl = import.meta.env.PROD ? "/api" : "http://localhost:8800/api";
const apiBaseUrl = import.meta.env.VITE_API_URL || defaultApiUrl;

const API = axios.create({
  baseURL: apiBaseUrl,
});

// Add token to requests if user is logged in
API.interceptors.request.use((config) => {
  const user = getUser();
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

// Origin of the Express server (for resolving uploaded file paths)
export const SERVER_URL = (
  apiBaseUrl
).replace(/\/api\/?$/, "");

/** Turn a server-relative path like "/images/x.jpg" into a full URL. */
export const fileUrl = (p) =>
  p && !String(p).startsWith("http") ? SERVER_URL + p : p || null;

/**
 * Extract a friendly message from an axios error. The Express server may
 * answer with plain JSON strings, {message} objects, or raw HTML (e.g. 404
 * "Cannot POST ..." when the server wasn't restarted) - never show raw HTML.
 */
export function errMsg(err, fallback = "Something went wrong") {
  const data = err?.response?.data;
  if (typeof data === "string") {
    const t = data.trim();
    if (t.startsWith("<")) return "Server error - is the server running? Try restarting it.";
    return t || fallback;
  }
  return data?.message || fallback;
}

export default API;
