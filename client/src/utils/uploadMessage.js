import API from "../api";
import { optimizeImage } from "./image";

const CHUNK_BYTES = 3 * 1024 * 1024;
const MAX_MESSAGE_MEDIA_BYTES = 50 * 1024 * 1024;

/** Send a chat attachment in Vercel-safe request sizes when it is large. */
export async function uploadMessageAttachment(originalFile, receiver, text = "") {
  const file = await optimizeImage(originalFile);
  if (file.size > MAX_MESSAGE_MEDIA_BYTES) {
    throw new Error("Photos and videos must be 50 MB or smaller.");
  }

  if (file.size <= CHUNK_BYTES) {
    const form = new FormData();
    form.append("receiver", receiver);
    form.append("text", text);
    form.append("file", file);
    return (await API.post("/messages", form)).data;
  }

  const totalChunks = Math.ceil(file.size / CHUNK_BYTES);
  const started = await API.post("/messages/upload/start", {
    receiver,
    text,
    filename: file.name,
    contentType: file.type,
    size: file.size,
    totalChunks,
  });
  const { uploadId } = started.data;

  for (let index = 0; index < totalChunks; index += 1) {
    const part = file.slice(index * CHUNK_BYTES, (index + 1) * CHUNK_BYTES);
    const form = new FormData();
    form.append("chunk", part, file.name);
    await API.post(`/messages/upload/${uploadId}/chunk/${index}`, form);
  }

  return (await API.post(`/messages/upload/${uploadId}/complete`)).data;
}
