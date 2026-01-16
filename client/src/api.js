import axios from "axios";
import { getUser } from "./utils/storage";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8800/api",
});

// Add token to requests if user is logged in
API.interceptors.request.use((config) => {
  const user = getUser();
  if (user && user.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export default API;
