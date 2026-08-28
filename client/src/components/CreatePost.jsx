import React, { useRef, useState } from "react";
import { FaFilm, FaImage, FaPhotoVideo, FaSmileBeam, FaTag, FaVideo } from "react-icons/fa";
import Avatar from "./Avatar";
import MediaUploadModal from "./MediaUploadModal";
import API, { errMsg } from "../api";
import { getUser } from "../utils/storage";

export default function CreatePost({ onNew }) {
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  // Quick-create from the collapsed bar icons: null | "photo" | "video" | "reel"
  const [quick, setQuick] = useState(null);
  const fileRef = useRef(null);
  const user = getUser();

  if (!user) return null;

  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    setIsVideo(f.type.startsWith("video"));
    setPreview(URL.createObjectURL(f));
    setExpanded(true);
  };

  const clearFile = () => {
    setFile(null);
    setPreview("");
    setIsVideo(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const reset = () => {
    setDesc("");
    clearFile();
    setExpanded(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = desc.trim();
    if (!text && !file) return;
    setBusy(true);
    try {
      let res;
      if (file) {
        // Photo post -> multipart/form-data
        const fd = new FormData();
        fd.append("desc", text);
        fd.append("img", file);
        res = await API.post("/posts", fd);
      } else {
        res = await API.post("/posts", { desc: text });
      }
      onNew && onNew(res.data);
      reset();
    } catch (err) {
      alert(errMsg(err, "Failed to create post"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className={`create-post card composer${expanded ? "" : " composer-collapsed"}`}
      onSubmit={handleSubmit}
    >
      {!expanded ? (
        <>
          <Avatar src={user.profilePicture} name={user.username} />
          <button
            type="button"
            className="composer-open"
            onClick={() => setExpanded(true)}
          >
            What's on your mind, {user.username}?
          </button>
          <span className="composer-spacer" />
          <button
            type="button"
            className="composer-mini red"
            title="Create video post"
            onClick={() => setQuick("video")}
          >
            <FaVideo />
          </button>
          <button
            type="button"
            className="composer-mini green"
            title="Create photo post"
            onClick={() => setQuick("photo")}
          >
            <FaImage />
          </button>
          <button
            type="button"
            className="composer-mini blue"
            title="Create reel"
            onClick={() => setQuick("reel")}
          >
            <FaFilm />
          </button>
        </>
      ) : (
        <div className="composer-body">
          <div className="composer-top">
            <Avatar src={user.profilePicture} name={user.username} size="avatar-sm" />
            <textarea
              autoFocus
              rows={3}
              maxLength={500}
              placeholder={`What's on your mind, ${user.username}?`}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>

          {preview && (
            <div className="composer-preview">
              {isVideo ? (
                <video src={preview} controls className="composer-video" />
              ) : (
                <img src={preview} alt="Preview" />
              )}
              <button
                type="button"
                className="preview-remove"
                onClick={clearFile}
                title="Remove photo"
              >
                ✕
              </button>
            </div>
          )}

          <div className="composer-actions">
            <button
              type="button"
              className="attach-btn green"
              onClick={() => fileRef.current && fileRef.current.click()}
            >
              <FaPhotoVideo /> Photo/video
            </button>
            <button type="button" className="attach-btn blue">
              <FaTag /> Tag people
            </button>
            <button type="button" className="attach-btn yellow">
              <FaSmileBeam /> Feeling
            </button>
            <span className="spacer" />
            <button type="button" className="btn-light" onClick={reset}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={busy || (!desc.trim() && !file)}
            >
              {busy ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="video/*,image/*"
        hidden
        onChange={pickFile}
      />

      {quick && (
        <MediaUploadModal
          title={
            quick === "photo"
              ? "Create photo post"
              : quick === "video"
              ? "Create video post"
              : "Create reel"
          }
          cta={quick === "reel" ? "Share reel" : "Post"}
          videoOnly={quick !== "photo"}
          onClose={() => setQuick(null)}
          onCreated={(p) => {
            onNew && onNew(p);
            setQuick(null);
          }}
        />
      )}
    </form>
  );
}
