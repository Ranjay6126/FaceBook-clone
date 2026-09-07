import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaUserPlus, FaUserCheck, FaUserMinus } from "react-icons/fa";
import Header from "../components/Header";
import Avatar from "../components/Avatar";
import API from "../api";
import { getUser } from "../utils/storage";

function syncLocalUser(mutator) {
  const u = getUser();
  if (!u) return;
  mutator(u);
  try {
    localStorage.setItem("user", JSON.stringify(u));
  } catch {}
}

export default function FriendsPage() {
  const [suggestions, setSuggestions] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const me = getUser();
    const sugg = API.get("/users/suggestions/me")
      .then((r) => r.data || [])
      .catch(() => []);
    const foll = Promise.all(
      ((me && me.followings) || []).map((id) =>
        API.get(`/users/${id}`).then((r) => r.data).catch(() => null)
      )
    ).then((list) => list.filter(Boolean));

    Promise.all([sugg, foll]).then(([s, f]) => {
      if (cancelled) return;
      setSuggestions(s);
      setFollowing(f);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const follow = async (u) => {
    await API.put(`/users/${u._id}/follow`).catch(() => null);
    syncLocalUser((me) => {
      me.followings = [...(me.followings || []), u._id];
    });
    setSuggestions((prev) => prev.filter((x) => x._id !== u._id));
    setFollowing((prev) => [...prev, u]);
  };

  const unfollow = async (u) => {
    await API.put(`/users/${u._id}/unfollow`).catch(() => null);
    syncLocalUser((me) => {
      me.followings = (me.followings || []).filter((x) => x !== u._id);
    });
    setFollowing((prev) => prev.filter((x) => x._id !== u._id));
    setSuggestions((prev) => [...prev, u]);
  };

  const removeSuggestion = (u) =>
    setSuggestions((prev) => prev.filter((x) => x._id !== u._id));

  return (
    <div className="page">
      <Header />
      <div className="container-narrow">
        <h2 className="page-title">Friends</h2>

        <section className="card section-pad">
          <h3 className="section-title">Friend suggestions</h3>
          {loading ? (
            <p className="muted">Loading...</p>
          ) : suggestions.length === 0 ? (
            <p className="muted">No suggestions right now. Invite some friends!</p>
          ) : (
            <div className="friend-grid">
              {suggestions.map((u) => (
                <div key={u._id} className="friend-card card">
                  <Link to={`/profile/${u._id}`} className="friend-photo-wrap">
                    <Avatar src={u.profilePicture} name={u.username} size="avatar-lg" />
                  </Link>
                  <Link to={`/profile/${u._id}`} className="friend-name">
                    {u.username}
                  </Link>
                  <button
                    className="btn-primary btn-block"
                    onClick={() => follow(u)}
                  >
                    <FaUserPlus /> Follow
                  </button>
                  <button
                    className="btn-light btn-block"
                    onClick={() => removeSuggestion(u)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card section-pad">
          <h3 className="section-title">People you follow</h3>
          {!loading && following.length === 0 ? (
            <p className="muted">You aren't following anyone yet.</p>
          ) : (
            <ul className="row-list">
              {following.map((u) => (
                <li key={u._id} className="row-item">
                  <Link to={`/profile/${u._id}`} className="avatar-link">
                    <Avatar src={u.profilePicture} name={u.username} />
                  </Link>
                  <Link to={`/profile/${u._id}`} className="row-name">
                    {u.username}
                    {u.city ? <span className="muted"> · {u.city}</span> : null}
                  </Link>
                  <span className="following-badge">
                    <FaUserCheck /> Following
                  </span>
                  <button className="btn-light" onClick={() => unfollow(u)}>
                    <FaUserMinus /> Unfollow
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}