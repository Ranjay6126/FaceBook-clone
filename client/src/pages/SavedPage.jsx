import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Post from "../components/Post";
import API from "../api";
import { getSavedIds, pruneSavedIds } from "../utils/storage";

export default function SavedPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const ids = getSavedIds();
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      ids.map((id) =>
        API.get(`/posts/${id}`).then((r) => r.data).catch(() => null)
      )
    ).then((list) => {
      if (cancelled) return;
      const found = list.filter(Boolean);
      // Forget bookmarks whose posts were deleted
      pruneSavedIds(found.map((p) => p._id));
      setPosts(found);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnsave = (id) =>
    setPosts((prev) => prev.filter((x) => x._id !== id));

  return (
    <div className="page">
      <Header />
      <div className="container-narrow">
        <h2 className="page-title">Saved</h2>
        {loading ? (
          <p className="muted center">Loading...</p>
        ) : posts.length === 0 ? (
          <div className="card empty-state">
            Nothing saved yet. Tap the bookmark icon on any post to save it for
            later.
          </div>
        ) : (
          posts.map((p) => (
            <Post key={p._id} post={p} onDeleted={handleUnsave} onSaveChange={handleUnsave} />
          ))
        )}
      </div>
    </div>
  );
}