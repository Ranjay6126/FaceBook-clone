import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaChevronRight,
  FaPlus,
  FaTimes,
  FaTrash,
  FaUser,
} from "react-icons/fa";
import API, { errMsg, fileUrl } from "../api";
import Avatar from "./Avatar";
import { getUser } from "../utils/storage";

/**
 * Home-page stories tray supporting BOTH photo and video stories:
 *  - "Create story" card opens an upload modal (photo or video + caption)
 *  - every other card opens a full-screen viewer that auto-advances
 *    (photos after 5 s, videos when they finish) with keyboard navigation.
 * Stories live for 24 hours (server-side TTL).
 */
export default function Stories() {
  const me = getUser();
  const myId = me ? String(me._id || me.id) : "";
  const [stories, setStories] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewIndex, setViewIndex] = useState(-1);
  const trayRef = useRef(null);

  useEffect(() => {
    if (!myId) return undefined;
    let alive = true;
    API.get("/stories")
      .then((r) => {
        if (alive) setStories(r.data || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [myId]);

  const onCreated = (story) => {
    if (story) setStories((prev) => [story, ...prev]);
    setShowCreate(false);
  };

  const onDeleted = (id) =>
    setStories((prev) => prev.filter((s) => s._id !== id));

  // Slide the tray (the floating arrow on the right, like facebook's)
  const slideTray = (dir) => {
    const el = trayRef.current;
    if (el) el.scrollBy({ left: dir * 460, behavior: "smooth" });
  };

  if (!myId) return null;

  return (
    <>
      <div className="stories-wrap">
        <div className="stories-tray" ref={trayRef}>
          <button
            type="button"
            className="story-card create"
            onClick={() => setShowCreate(true)}
          >
            <span className="story-create-avatar">
              {me.profilePicture ? (
                <Avatar src={me.profilePicture} name={me.username} />
              ) : (
                <FaUser className="story-silhouette" />
              )}
            </span>
            <span className="story-create-plus">
              <FaPlus />
            </span>
            <span className="story-name">Create story</span>
          </button>

          {stories.map((s, i) => (
            <button
              key={s._id}
              type="button"
              className="story-card"
              onClick={() => setViewIndex(i)}
            >
              {s.video ? (
                <video src={fileUrl(s.video)} muted playsInline preload="metadata" />
              ) : (
                <img src={fileUrl(s.img)} alt="" />
              )}
              <span className="story-avatar">
                <Avatar
                  src={(s.userInfo && s.userInfo.profilePicture) || ""}
                  name={(s.userInfo && s.userInfo.username) || "F"}
                />
              </span>
              <span className="story-name">
                {(s.userInfo && s.userInfo.username) || "Facebook User"}
              </span>
            </button>
          ))}
        </div>

        {stories.length > 3 && (
          <button
            type="button"
            className="stories-nav"
            title="More stories"
            onClick={() => slideTray(1)}
          >
            <FaChevronRight />
          </button>
        )}
      </div>

      {showCreate && (
        <CreateStoryModal
          onClose={() => setShowCreate(false)}
          onCreated={onCreated}
        />
      )}

      {viewIndex >= 0 && stories[viewIndex] && (
        <StoryViewer
          stories={stories}
          startIndex={viewIndex}
          myId={myId}
          onClose={() => setViewIndex(-1)}
          onDeleted={onDeleted}
        />
      )}
    </>
  );
}

/** Upload modal: a photo OR video becomes a story via /stories. */
function CreateStoryModal({ onClose, onCreated }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
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
    if (!file) return alert("Pick a photo or video first.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("caption", caption.trim());
      fd.append("media", file); // server routes image vs video by mimetype
      const res = await API.post("/stories", fd);
      onCreated(res.data);
    } catch (err) {
      alert(errMsg(err, "Upload failed"));
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
          <h3>Create story</h3>
          <button type="button" className="icon-action" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {preview ? (
          <div className="mk-photo-preview">
            {isVideo ? (
              <video
                src={preview}
                controls
                autoPlay
                loop
                muted
                className="mk-preview-video"
              />
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
            <span>Select a photo or video</span>
            <small>Stories disappear after 24 hours</small>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="video/*,image/*"
          hidden
          onChange={pickFile}
        />

        <input
          className="input"
          placeholder="Caption (optional)"
          value={caption}
          maxLength={100}
          onChange={(e) => setCaption(e.target.value)}
        />

        <div className="modal-actions">
          <button type="button" className="btn-light" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy || !file}>
            {busy ? "Sharing…" : "Share to story"}
          </button>
        </div>
      </form>
    </div>
  );
}

function timeAgo(dateStr) {
  const secs = Math.max(
    1,
    Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  );
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/**
 * Full-screen story viewer: progress bars up top, arrow buttons / keys to
 * move between stories, photos auto-advance after 5 s, videos advance
 * when they finish playing.
 */
function StoryViewer({ stories, startIndex, myId, onClose, onDeleted }) {
  const [idx, setIdx] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef(null);

  const story = stories[idx];

  const goNext = () => {
    setProgress(0);
    if (idx + 1 >= stories.length) onClose();
    else setIdx(idx + 1);
  };

  const goPrev = () => {
    setProgress(0);
    setIdx(Math.max(0, idx - 1));
  };

  // Photos advance automatically after 5 seconds
  useEffect(() => {
    if (!story || story.video) return undefined;
    const t = setTimeout(goNext, 5000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story && story._id]);

  // Keyboard: Esc closes, arrow keys navigate (fresh handlers every render)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const removeCurrent = async () => {
    if (!story || !window.confirm("Delete this story?")) return;
    const id = story._id;
    try {
      await API.delete(`/stories/${id}`);
      onDeleted(id);
      if (stories.length <= 1) onClose();
      else if (idx >= stories.length - 1) setIdx(stories.length - 2);
    } catch {
      /* keep the viewer open; nothing else to do */
    }
  };

  if (!story) return null;

  const author = story.userInfo || {};
  const authorId = author._id || null;

  return (
    <div
      className="story-viewer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="story-stage">
        {/* Progress bars: one per story */}
        <div className="story-bars">
          {stories.map((s, i) => (
            <span key={s._id} className="story-bar">
              {i < idx && <i style={{ width: "100%" }} />}
              {i === idx && <i style={{ width: `${progress}%` }} />}
            </span>
          ))}
        </div>

        <div className="story-head">
          {authorId ? (
            <Link
              to={`/profile/${authorId}`}
              className="story-author"
              onClick={onClose}
            >
              <Avatar
                src={author.profilePicture}
                name={author.username}
                size="avatar-xs"
              />
              <span>{author.username || "Facebook User"}</span>
            </Link>
          ) : (
            <span className="story-author">
              <Avatar name={author.username} size="avatar-xs" />
              <span>{author.username || "Facebook User"}</span>
            </span>
          )}
          <span className="story-time">{timeAgo(story.createdAt)}</span>
          <span className="story-head-actions">
            {String(story.userId) === String(myId) && (
              <button
                type="button"
                className="story-action"
                title="Delete story"
                onClick={removeCurrent}
              >
                <FaTrash />
              </button>
            )}
            <button
              type="button"
              className="story-action"
              title="Close"
              onClick={onClose}
            >
              <FaTimes />
            </button>
          </span>
        </div>

        {story.video ? (
          <video
            ref={videoRef}
            key={story._id}
            src={fileUrl(story.video)}
            autoPlay
            playsInline
            onClick={togglePlay}
            onTimeUpdate={(e) => {
              const v = e.currentTarget;
              if (v.duration) setProgress((v.currentTime / v.duration) * 100);
            }}
            onEnded={goNext}
          />
        ) : (
          <img
            key={story._id}
            src={fileUrl(story.img)}
            alt={story.caption || "Story"}
          />
        )}

        {story.caption && <p className="story-caption">{story.caption}</p>}

        <button
          type="button"
          className="story-nav prev"
          title="Previous story"
          disabled={idx === 0}
          onClick={goPrev}
        >
          <FaChevronLeft />
        </button>
        <button
          type="button"
          className="story-nav next"
          title="Next story"
          onClick={goNext}
        >
          <FaChevronRight />
        </button>
      </div>
    </div>
  );
}