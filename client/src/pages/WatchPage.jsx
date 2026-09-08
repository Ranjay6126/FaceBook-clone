import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Post from "../components/Post";
import API, { fileUrl } from "../api";
import { getUser } from "../utils/storage";

// "Watch" = a media-focused feed built from posts that have photos
export default function WatchPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const me = getUser();
    const id = me ? String(me._id || me.id) : "";
    if (!id) {
      setLoading(false);
      return;
    }
    API.get(`/posts/timeline/${id}`)
      .then((res) => {
        if (cancelled) return;
        setPosts((res.data || []).filter((p) => p.img || p.video));
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <Header />
      <div className="container-narrow">
        <h2 className="page-title">Watch</h2>
        {loading ? (
          <p className="muted center">Loading...</p>
        ) : posts.length === 0 ? (
          <div className="card empty-state">
            No photos or videos to watch yet. Share a photo on your feed and it
            will show up here!
          </div>
        ) : (
          posts.map((p) => (
            <Post
              key={p._id}
              post={p}
              onDeleted={(id) => setPosts((prev) => prev.filter((x) => x._id !== id))}
            />
          ))
        )}
      </div>
    </div>
  );
}