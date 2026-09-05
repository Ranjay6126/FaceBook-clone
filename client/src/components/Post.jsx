import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  FaThumbsUp,
  FaRegThumbsUp,
  FaRegComment,
  FaShare,
  FaRegBookmark,
  FaBookmark,
  FaTrashAlt,
} from "react-icons/fa";
import API, { fileUrl } from "../api";
import Avatar from "./Avatar";
import { getUser, isPostSaved, toggleSavedId } from "../utils/storage";

function timeAgo(date) {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function Post({ post, onDeleted, onSaveChange }) {
  const [likes, setLikes] = useState(post.likes || []);
  const [comments, setComments] = useState(post.comments || []);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(isPostSaved(post._id));
  const user = getUser();
  const myId = user ? String(user._id || user.id) : "";

  const author = post.userInfo || {};
  const authorName = author.username || "Facebook User";
  const authorId = author._id || null;
  const isLiked = Boolean(myId) && likes.map(String).includes(myId);
  const isOwner = Boolean(myId) && String(post.userId) === myId;

  const toggleLike = async () => {
    if (!myId) return alert("Please log in to like posts.");
    const wasLiked = isLiked;
    setLikes(wasLiked ? likes.filter((l) => String(l) !== myId) : [...likes, myId]);
    try {
      await API.put(`/posts/${post._id}/like`);
    } catch (err) {
      setLikes(
        wasLiked ? likes.filter((l) => String(l) !== myId) : [...likes, myId]
      );
      alert(err?.response?.data?.message || err?.response?.data || "Failed to like post");
    }
  };

  const addComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await API.post(`/posts/${post._id}/comment`, { text });
      setComments(res.data?.comments || []);
      setCommentText("");
    } catch (err) {
      alert(err?.response?.data?.message || err?.response?.data || "Failed to comment");
    } finally {
      setSending(false);
    }
  };

  const deletePost = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await API.delete(`/posts/${post._id}`);
      onDeleted && onDeleted(post._id);
    } catch (err) {
      alert(err?.response?.data?.message || err?.response?.data || "Failed to delete");
    }
  };

  const sharePost = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin + "/");
      alert("Link copied to clipboard!");
    } catch {
      alert("Couldn't copy the link.");
    }
  };

  const toggleSave = () => {
    const now = toggleSavedId(post._id);
    setSaved(now);
    onSaveChange && onSaveChange(post._id, now);
  };

  const AuthorLink = ({ className, children }) =>
    authorId ? (
      <Link to={`/profile/${authorId}`} className={className}>
        {children}
      </Link>
    ) : (
      <div className={className}>{children}</div>
    );

  return (
    <article className="post card">
      <div className="post-header">
        <AuthorLink className="avatar-link">
          <Avatar src={author.profilePicture} name={authorName} />
        </AuthorLink>
        <div className="post-author-info">
          <AuthorLink className="post-author-name">{authorName}</AuthorLink>
          <div className="post-time">{timeAgo(post.createdAt)}</div>
        </div>
        <button
          type="button"
          className={`icon-action${saved ? " saved" : ""}`}
          title={saved ? "Remove bookmark" : "Save post"}
          onClick={toggleSave}
        >
          {saved ? <FaBookmark /> : <FaRegBookmark />}
        </button>
        {isOwner && (
          <button type="button" className="icon-action" title="Delete post" onClick={deletePost}>
            <FaTrashAlt />
          </button>
        )}
      </div>

      <div className="post-content">
        {post.desc && <div className="post-desc">{post.desc}</div>}
        {post.img && (
          <img src={fileUrl(post.img)} alt="Post" className="post-image" />
        )}
        {post.video && (
          <video src={fileUrl(post.video)} controls className="post-video" />
        )}
      </div>

      {(likes.length > 0 || comments.length > 0) && (
        <div className="post-stats">
          <span>{likes.length > 0 ? `👍 ${likes.length}` : ""}</span>
          <button
            type="button"
            className="stat-link"
            onClick={() => setShowComments((s) => !s)}
          >
            {comments.length} {comments.length === 1 ? "comment" : "comments"}
          </button>
        </div>
      )}

      <div className="post-actions">
        <button type="button" onClick={toggleLike} className={isLiked ? "liked" : ""}>
          {isLiked ? <FaThumbsUp /> : <FaRegThumbsUp />}
          <span>{isLiked ? "Liked" : "Like"}</span>
        </button>
        <button type="button" onClick={() => setShowComments((s) => !s)}>
          <FaRegComment />
          <span>Comment</span>
        </button>
        <button type="button" onClick={sharePost}>
          <FaShare />
          <span>Share</span>
        </button>
      </div>

      {showComments && (
        <div className="comments">
          {comments.map((c, i) => (
            <div className="comment" key={c.createdAt || i}>
              <Avatar name={c.username} size="avatar-xs" />
              <div className="comment-bubble">
                <div className="comment-author">
                  {c.username || "Facebook User"}
                </div>
                <div className="comment-text">{c.text}</div>
              </div>
            </div>
          ))}
          <form className="comment-form" onSubmit={addComment}>
            <Avatar name={user ? user.username : "U"} size="avatar-xs" />
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              maxLength={300}
            />
            <button type="submit" disabled={sending || !commentText.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </article>
  );
}