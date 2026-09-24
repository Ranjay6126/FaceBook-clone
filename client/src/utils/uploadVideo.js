import API from "../api";

export const MAX_VIDEO_UPLOAD_BYTES = 50 * 1024 * 1024;
const CHUNK_BYTES = 3 * 1024 * 1024;

/** Upload a video to the API in request sizes below Vercel's function limit. */
export async function uploadVideoPost(file, desc = "", onProgress) {
  if (!file?.type?.startsWith("video/")) {
    throw new Error("Choose a video file.");
  }
  if (file.size > MAX_VIDEO_UPLOAD_BYTES) {
    throw new Error("Videos must be 50 MB or smaller. Choose a shorter or smaller video.");
  }

  const totalChunks = Math.ceil(file.size / CHUNK_BYTES);
  const start = await API.post("/posts/reel-upload/start", {
    desc: desc.trim(),
    filename: file.name,
    contentType: file.type,
    size: file.size,
    totalChunks,
  });
  const { uploadId } = start.data;

  for (let index = 0; index < totalChunks; index += 1) {
    const chunk = file.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
    const data = new FormData();
    data.append("chunk", chunk, file.name);
    await API.post(`/posts/reel-upload/${uploadId}/chunk/${index}`, data);
    if (onProgress) onProgress(Math.round(((index + 1) / totalChunks) * 100));
  }

  const result = await API.post(`/posts/reel-upload/${uploadId}/complete`);
  return result.data;
}
