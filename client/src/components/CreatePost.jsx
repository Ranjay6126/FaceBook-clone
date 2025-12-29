import { useState } from "react";
import API from "../api";
import { getUser } from "../utils/storage";

export default function CreatePost({ onNew }) {
  const [desc, setDesc] = useState("");
  const user = getUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Login to post");
    try {
      const res = await API.post("/posts", { userId: user._id || user.id, desc });
      setDesc("");
      onNew && onNew(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form className="create-post" onSubmit={handleSubmit}>
      <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What's on your mind?" />
      <button type="submit">Post</button>
    </form>
  );
}
