import React, { useRef, useState } from "react";
import { FaPlus, FaTimes } from "react-icons/fa";
import API from "../api";

/**
 * Shared upload modal used from inside profiles:
 *  - Photo post (accepts images only)
 *  - Video post (accepts videos only)
 *  - Reel       (a VIDEO-only short post -> shows up in the Reels feed)
 *
 * Everything becomes a regular post via POST /posts; the server routes the
 * uploaded file into `img` or `video` based on its mimetype.
 */
export default function MediaUploadModal({
  title,
  cta = "Post",
  videoOnly = false,
  onClose,
  onCreated,
}) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (videoOnly && !f.type.startsWith("video")) {
      alert(`${title} needs a video file.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (!videoOnly && !f.type.startsWith("image")) {
      alert(`${title} needs an image file.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFile(f);
    setIsVideo(f.type.startsWith("video"));
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => {
    setFile(null);
    setPreview("");
    setIsVideo(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!file) return alert(`Select ${videoOnly ? "a video" : "a photo"} first.`);
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("desc", desc.trim());
      fd.append("img", file); // server routes image vs video by mimetype
      const res = await API.post("/posts", fd);
      onCreated(res.data);
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Upload failed"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form className="modal-card mk-create card" onSubmit={submit}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-action" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {preview ? (
          <div className="mk-photo-preview">
            {isVideo ? (
              <video src={preview} controls className="mk-preview-video" />
            ) : (
              <img src={preview} alt="Preview" />
            )}
            <button
              type="button"
              className="preview-remove"
              onClick={clearFile}
              title="Remove"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="mk-photo-add"
            onClick={() => fileRef.current && fileRef.current.click()}
          >
            <FaPlus />
            <span>Select {videoOnly ? "a video" : "a photo"}</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={videoOnly ? "video/*" : "image/*"}
          hidden
          onChange={pickFile}
        />

        <input
          className="input"
          placeholder="Caption (optional)"
          value={desc}
          maxLength={500}
          onChange={(e) => setDesc(e.target.value)}
        />

        <div className="modal-actions">
          <button type="button" className="btn-light" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !file}>
            {busy ? "Uploading…" : cta}
          </button>
        </div>
      </form>
    </div>
  );
}