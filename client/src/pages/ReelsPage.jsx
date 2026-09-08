import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaChevronDown,
  FaChevronUp,
  FaPlus,
  FaTimes,
  FaPlay,
  FaHeart,
  FaRegHeart,
  FaRegComment,
} from "react-icons/fa";
import Header from "../components/Header";
import Avatar from "../components/Avatar";
import Reel from "../components/Reel";
import API, { fileUrl } from "../api";
import { getUser } from "../utils/storage";

/**
 * Reels: full-height, snap-scrolling feed built from VIDEO posts only.
 * (?media=video filters server-side; we also guard client-side.)
 */
export default function ReelsPage() {
  const me = getUser();
  const myId = me ? String(me._id || me.id) : "";
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const feedRef = useRef(null);

  useEffect(() => {
    if (!myId) {
      setLoading(false);
      return undefined;
    }
    let alive = true;
    API.get(`/posts/timeline/${myId}?media=video`)
      .then((r) => {
        if (!alive) return;
        setReels(
          (r.data || [])
            .filter((p) => p.video) // reels are videos only
            .slice(0, 20)
        );
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [myId]);

  const onCreated = (post) => {
    if (post && post.video) {
      setReels((prev) => [post, ...prev]);
    }
    setShowCreate(false);
  };

  // Jump exactly one reel up/down (snap scrolling does the rest)
  const scrollOne = (dir) => {
    const el = feedRef.current;
    if (el) el.scrollBy({ top: dir * el.clientHeight, behavior: "smooth" });
  };

  return (
    <div className="page">
      <Header />
      <div className="reels-wrap">
        <div className="reels-top">
          <h2>Reels</h2>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <FaPlus /> Create reel
          </button>
        </div>

        {loading ? (
          <p className="muted center">Loading reels…</p>
        ) : reels.length === 0 ? (
          <div className="card empty-state">
            No reels yet. Hit "Create reel" to upload your first video!
          </div>
        ) : (
          <div className="reels-feed" ref={feedRef}>
            {reels.map((p) => (
              <Reel key={p._id} post={p} />
            ))}
          </div>
        )}
      </div>

      {!loading && reels.length > 1 && (
        <div className="reels-navs">
          <button
            type="button"
            title="Previous reel"
            onClick={() => scrollOne(-1)}
          >
            <FaChevronUp />
          </button>
          <button
            type="button"
            title="Next reel"
            onClick={() => scrollOne(1)}
          >
            <FaChevronDown />
          </button>
        </div>
      )}

      {showCreate && (
        <CreateReelModal
          onClose={() => setShowCreate(false)}
          onCreated={onCreated}
        />
      )}
    </div>
  );
}

/** Upload modal: only a VIDEO becomes a reel (regular post via /posts). */
function CreateReelModal({ onClose, onCreated }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);

  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!f.type.startsWith("video")) {
      alert("Reels can only be videos.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setFile(f);
    setIsVideo(true);
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
    if (!file) return alert("Pick a video first.");
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
          <h3>Create reel</h3>
          <button type="button" className="icon-action" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        {preview ? (
          <div className="mk-photo-preview">
            {isVideo ? (
              <video src={preview} controls className="composer-video" />
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
            <span>Select a video</span>
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          hidden
          onChange={pickFile}
        />

        <input
          className="input"
          placeholder="Caption (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          maxLength={500}
        />

        <div className="modal-actions">
          <button type="button" className="btn-light" onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
            disabled={busy || !file}
          >
            {busy ? "Uploading…" : "Share reel"}
          </button>
        </div>
      </form>
    </div>
  );
}