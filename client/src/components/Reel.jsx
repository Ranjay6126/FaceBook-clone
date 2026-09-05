import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaHeart, FaRegHeart, FaPlay, FaShare } from "react-icons/fa";
import API, { fileUrl } from "../api";
import Avatar from "./Avatar";
import { getUser } from "../utils/storage";

/**
 * One reel in the snap-scrolling feed: a full-height video (tap to
 * play/pause) or photo with an author/caption overlay and a like rail.
 *
 * NOTE: ReelsPage always rendered <Reel>, but this component was missing
 * from the codebase — React crashed mid-render and unmounting the broken
 * tree threw "Failed to execute 'removeChild' on Node".
 */
export default function Reel({ post }) {
  const me = getUser();
  const myId = me ? String(me._id || me.id) : "";
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [likes, setLikes] = useState(post.likes || []);

  const author = post.userInfo || {};
  const authorId = author._id || null;
  const isLiked = Boolean(myId) && likes.map(String).includes(myId);
  const isVideo = Boolean(post.video);
  const src = fileUrl(isVideo ? post.video : post.img);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play()
        .then(() => setPlaying(true))
        .catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  // One-by-one feed: auto-play while this reel is mostly in view and pause
  // it again when it scrolls out (tap still toggles play/pause)
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !isVideo) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.intersectionRatio >= 0.6) {
            v.play()
              .then(() => setPlaying(true))
              .catch(() => {});
          } else if (!v.paused) {
            v.pause();
            setPlaying(false);
          }
        });
      },
      { threshold: [0, 0.6, 1] }
    );
    io.observe(v);
    return () => io.disconnect();
  }, [isVideo]);

  const toggleLike = async () => {
    if (!myId) return alert("Please log in to like posts.");
    const wasLiked = isLiked;
    setLikes(
      wasLiked ? likes.filter((l) => String(l) !== myId) : [...likes, myId]
    );
    try {
      await API.put(`/posts/${post._id}/like`);
    } catch {
      // roll back on failure
      setLikes(
        wasLiked ? likes.filter((l) => String(l) !== myId) : [...likes, myId]
      );
    }
  };

  const sharePost = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/reels");
      alert("Link copied to clipboard!");
    } catch {
      alert("Couldn't copy the link.");
    }
  };

  return (
    <article className="reel">
      <div className="reel-media">
        {isVideo ? (
          <video
            ref={videoRef}
            src={src}
            loop
            playsInline
            preload="metadata"
            onClick={togglePlay}
          />
        ) : (
          <img src={src} alt={post.desc || "Reel"} />
        )}
        {isVideo && !playing && (
          <span className="reel-paused">
            <FaPlay />
          </span>
        )}
      </div>

      <div className="reel-overlay">
        {authorId ? (
          <Link to={`/profile/${authorId}`} className="reel-author">
            <Avatar
              src={author.profilePicture}
              name={author.username}
              size="avatar-xs"
            />
            <span>{author.username || "Facebook User"}</span>
          </Link>
        ) : (
          <span className="reel-author">
            <Avatar name={author.username} size="avatar-xs" />
            <span>{author.username || "Facebook User"}</span>
          </span>
        )}
        {post.desc && <p className="reel-desc">{post.desc}</p>}
      </div>

      <div className="reel-rail">
        <button
          type="button"
          className={isLiked ? "liked" : ""}
          title={isLiked ? "Unlike" : "Like"}
          onClick={toggleLike}
        >
          {isLiked ? <FaHeart /> : <FaRegHeart />}
          <span>{likes.length}</span>
        </button>
        <button type="button" title="Copy link" onClick={sharePost}>
          <FaShare />
          <span>Share</span>
        </button>
      </div>
    </article>
  );
}
