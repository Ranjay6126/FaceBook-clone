import { useState } from "react";
import API from "../api";
import { getUser } from "../utils/storage";

export default function CreatePost({ onNew }) {
  const [desc, setDesc] = useState("");
  const user = getUser();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Login to post");
    if (!desc.trim()) return alert("Please enter some text");
    try {
      const res = await API.post("/posts", { desc: desc.trim() });
      setDesc("");
      onNew && onNew(res.data);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err?.response?.data || "Failed to create post");
    }
  };

  const userInitial = user ? (user.username || "U").charAt(0).toUpperCase() : "U";

  return (
    <form className="create-post" onSubmit={handleSubmit}>
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ffffff",
          fontWeight: "600",
          fontSize: "18px",
          flexShrink: 0,
        }}
      >
        {userInitial}
      </div>
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="What's on your mind?"
        required
      />
      <button type="submit">Post</button>
    </form>
  );
}
