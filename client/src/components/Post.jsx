import { useState } from "react";
import API from "../api";
import { getUser } from "../utils/storage";

export default function Post({ post }) {
  const [likes, setLikes] = useState(post.likes || []);
  const user = getUser();

  const toggleLike = async () => {
    if (!user) return alert("Login to like");
    try {
      await API.put(`/posts/${post._id}/like`);
      const userId = String(user._id || user.id);
      const likesStrings = likes.map(String);
      if (likesStrings.includes(userId)) {
        setLikes(likes.filter((l) => String(l) !== userId));
      } else {
        setLikes([...(likes || []), userId]);
      }
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err?.response?.data || "Failed to like post");
    }
  };

  const isLiked = user && likes.map(String).includes(String(user._id || user.id));
  const authorInitial = post.userId ? post.userId.charAt(0).toUpperCase() : "U";

  return (
    <div className="post">
      <div className="post-header">
        <div className="post-author-avatar">{authorInitial}</div>
        <div className="post-author-info">
          <div className="post-author-name">{post.userId || "User"}</div>
          <div className="post-time">
            {post.createdAt
              ? new Date(post.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              : "Just now"}
          </div>
        </div>
      </div>
      <div className="post-content">
        {post.desc && <div className="post-desc">{post.desc}</div>}
        {post.img && (
          <img src={post.img} alt="Post" className="post-image" />
        )}
      </div>
      {likes.length > 0 && (
        <div className="post-stats">
          <span>👍 {likes.length} {likes.length === 1 ? "like" : "likes"}</span>
        </div>
      )}
      <div className="post-actions">
        <button onClick={toggleLike} className={isLiked ? "liked" : ""}>
          <span>👍</span>
          <span>Like</span>
        </button>
        <button>
          <span>💬</span>
          <span>Comment</span>
        </button>
        <button>
          <span>📤</span>
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}
