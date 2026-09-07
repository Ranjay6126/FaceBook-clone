import React, { useEffect, useState } from "react";
import Header from "../components/Header";
import Post from "../components/Post";
import API from "../api";
import { getUser } from "../utils/storage";

// "Memories" = your own posts, oldest first (a little throwback feed)
export default function MemoriesPage() {
  const [posts, setPosts] = useState([]);
  const [onThisDay, setOnThisDay] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const me = getUser();
    const id = me ? String(me._id || me.id) : "";
    if (!id) {
      setLoading(false);
      return;
    }
    API.get(`/posts/user/${id}`)
      .then((res) => {
        if (cancelled) return;
        const mine = res.data || [];
        const now = new Date();
        const sameDay = (d) => {
          const t = new Date(d);
          return (
            t.getMonth() === now.getMonth() &&
            t.getDate() === now.getDate() &&
            t.getFullYear() < now.getFullYear()
          );
        };
        setOnThisDay(mine.filter((p) => sameDay(p.createdAt)));
        setPosts([...mine].reverse()); // oldest first
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
        <h2 className="page-title">Memories</h2>

        {loading ? (
          <p className="muted center">Loading...</p>
        ) : (
          <>
            {onThisDay.length > 0 && (
              <section>
                <h3 className="section-title">On this day</h3>
                {onThisDay.map((p) => (
                  <Post key={p._id} post={p} />
                ))}
              </section>
            )}

            <section>
              <h3 className="section-title">Your older posts</h3>
              {posts.length === 0 ? (
                <div className="card empty-state">
                  You haven't posted anything yet. Your memories will appear
                  here once you do!
                </div>
              ) : (
                posts.slice(0, 10).map((p) => (
                  <Post
                    key={p._id}
                    post={p}
                    onDeleted={(id) =>
                      setPosts((prev) => prev.filter((x) => x._id !== id))
                    }
                  />
                ))
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}