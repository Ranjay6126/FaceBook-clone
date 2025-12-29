import { useState } from "react";
import API from "../api";
import { getUser } from "../utils/storage";

export default function Post({ post }) {
  const [likes, setLikes] = useState(post.likes || []);
  const user = getUser();

  const toggleLike = async () => {
    if (!user) return alert("Login to like");
    try {
      await API.put(`/posts/${post._id}/like`, { userId: user._id || user.id });
      if (likes.includes(user._id || user.id)) setLikes(likes.filter((l) => l !== (user._id || user.id)));
      else setLikes([...(likes || []), user._id || user.id]);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="post">
      <div className="post-author">{post.userId}</div>
      <div className="post-desc">{post.desc}</div>
      <div className="post-actions">
        <button onClick={toggleLike}>Like ({likes.length})</button>
      </div>
    </div>
  );
}
