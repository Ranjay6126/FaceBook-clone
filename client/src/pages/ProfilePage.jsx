import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  FaCamera,
  FaMapMarkerAlt,
  FaInfoCircle,
  FaUserPlus,
  FaUserCheck,
  FaPencilAlt,
  FaPlay,
  FaImage,
  FaVideo,
  FaFilm,
} from "react-icons/fa";
import Header from "../components/Header";
import Post from "../components/Post";
import CreatePost from "../components/CreatePost";
import MediaUploadModal from "../components/MediaUploadModal";
import Avatar from "../components/Avatar";
import API, { fileUrl } from "../api";
import { getUser } from "../utils/storage";

export default function ProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  // Profile sections: posts | photos | videos | reels
  const [tab, setTab] = useState("posts");
  // Quick-create modal on your own profile: null | "photo" | "video" | "reel"
  const [uploadModal, setUploadModal] = useState(null);

  // edit-profile form state
  const [form, setForm] = useState({ desc: "", city: "", from: "" });
  const [profilePic, setProfilePic] = useState(null);
  const [coverPic, setCoverPic] = useState(null);
  const [profilePreview, setProfilePreview] = useState("");
  const [coverPreview, setCoverPreview] = useState("");

  const me = getUser();
  const myId = me ? String(me._id || me.id) : "";
  const isMe = String(id) === myId;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setEditing(false);
    Promise.all([
      API.get(`/users/${id}`).then((r) => r.data).catch(() => null),
      API.get(`/posts/user/${id}`).then((r) => r.data || []).catch(() => []),
    ]).then(([u, p]) => {
      if (cancelled) return;
      if (!u) {
        setNotFound(true);
      } else {
        setProfile(u);
        setForm({ desc: u.desc || "", city: u.city || "", from: u.from || "" });
        setPosts(p);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Media sections derived from this profile's posts
  const photos = useMemo(() => posts.filter((p) => p.img), [posts]);
  const videos = useMemo(() => posts.filter((p) => p.video), [posts]);
  // Reels are VIDEOS only
  const reels = useMemo(() => posts.filter((p) => p.video), [posts]);

  // Prepend a freshly created post (inline composer / quick-create modals)
  const handleNewPost = (p) => p && setPosts((prev) => [p, ...prev]);

  const followed = Boolean(
    me &&
      ((me.followings || []).map(String).includes(String(id)) ||
        (profile?.followers || []).map(String).includes(myId))
  );

  const toggleFollow = async () => {
    await API.put(`/users/${id}/${followed ? "unfollow" : "follow"}`).catch(
      () => null
    );
    if (me) {
      me.followings = followed
        ? (me.followings || []).filter((x) => x !== id)
        : [...(me.followings || []), id];
      try {
        localStorage.setItem("user", JSON.stringify(me));
      } catch {}
    }
    // refresh follower counts
    API.get(`/users/${id}`)
      .then((r) => r.data)
      .then((u) => u && setProfile(u))
      .catch(() => {});
  };

  const pickFile = (setter, previewSetter) => (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setter(f);
    previewSetter(URL.createObjectURL(f));
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("desc", form.desc);
      fd.append("city", form.city);
      fd.append("from", form.from);
      if (profilePic) fd.append("profilePicture", profilePic);
      if (coverPic) fd.append("coverPicture", coverPic);
      const res = await API.put("/users/update/me", fd);
      // Refresh the stored session so header/sidebar avatars update instantly
      localStorage.setItem("user", JSON.stringify(res.data));
      setEditing(false);
      setProfilePic(null);
      setCoverPic(null);
      setProfilePreview("");
      setCoverPreview("");
      window.location.reload();
    } catch (err) {
      alert(err?.response?.data?.message || err?.response?.data || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page">
        <Header />
        <p className="muted center" style={{ padding: "2rem" }}>Loading...</p>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="page">
        <Header />
        <div className="container-narrow">
          <div className="card empty-state">This account isn't available.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header />
      <div className="container-narrow">
        <div className="card profile-card">
          <div
            className={`profile-cover${profile.coverPicture ? "" : " cover-default"}`}
          >
            {profile.coverPicture && (
              <img src={fileUrl(profile.coverPicture)} alt="Cover" />
            )}
            {isMe && (
              <button
                type="button"
                className="cover-edit"
                onClick={() => setEditing(true)}
              >
                <FaCamera /> Edit cover
              </button>
            )}
          </div>

          <div className="profile-head">
            <div className="profile-avatar-wrap">
              <Avatar
                src={profile.profilePicture}
                name={profile.username}
                size="avatar-xl"
              />
              {isMe && (
                <button
                  type="button"
                  className="avatar-edit"
                  title="Change profile photo"
                  onClick={() => setEditing(true)}
                >
                  <FaCamera />
                </button>
              )}
            </div>
            <h2>{profile.username}</h2>
            {profile.desc && <p className="profile-bio">{profile.desc}</p>}
            <div className="profile-meta">
              {profile.city && (
                <span>
                  <FaMapMarkerAlt /> Lives in {profile.city}
                </span>
              )}
              {profile.from && (
                <span>
                  <FaInfoCircle /> From {profile.from}
                </span>
              )}
              <span>
                {(profile.followers || []).length} followers ·{" "}
                {(profile.followings || []).length} following
              </span>
            </div>
            {isMe ? (
              <button type="button" className="btn-light" onClick={() => setEditing(true)}>
                <FaPencilAlt /> Edit profile
              </button>
            ) : (
              <button
                type="button"
                className={followed ? "btn-light" : "btn-primary"}
                onClick={toggleFollow}
              >
                {followed ? <FaUserCheck /> : <FaUserPlus />}
                {followed ? " Following" : " Follow"}
              </button>
            )}
          </div>
        </div>

        {/* Profile sections: Posts / Photos / Videos / Reels */}
        <nav className="profile-tabs card">
          <button
            type="button"
            className={"profile-tab" + (tab === "posts" ? " active" : "")}
            onClick={() => setTab("posts")}
          >
            Posts
          </button>
          <button
            type="button"
            className={"profile-tab" + (tab === "photos" ? " active" : "")}
            onClick={() => setTab("photos")}
          >
            Photos
          </button>
          <button
            type="button"
            className={"profile-tab" + (tab === "videos" ? " active" : "")}
            onClick={() => setTab("videos")}
          >
            Videos
          </button>
          <button
            type="button"
            className={"profile-tab" + (tab === "reels" ? " active" : "")}
            onClick={() => setTab("reels")}
          >
            Reels
          </button>
        </nav>

        {editing && isMe && (
          <form className="card section-pad edit-form" onSubmit={saveEdit}>
            <h3 className="section-title">Edit profile</h3>
            <label className="file-label">
              Profile picture
              <input
                type="file"
                accept="image/*"
                onChange={pickFile(setProfilePic, setProfilePreview)}
              />
            </label>
            {profilePreview && (
              <img src={profilePreview} alt="" className="edit-preview round" />
            )}
            <label className="file-label">
              Cover photo
              <input
                type="file"
                accept="image/*"
                onChange={pickFile(setCoverPic, setCoverPreview)}
              />
            </label>
            {coverPreview && <img src={coverPreview} alt="" className="edit-preview" />}
            <input
              className="input"
              placeholder="Bio (e.g. Love coding and coffee)"
              value={form.desc}
              maxLength={50}
              onChange={(e) => setForm({ ...form, desc: e.target.value })}
            />
            <input
              className="input"
              placeholder="City"
              value={form.city}
              maxLength={50}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
            <input
              className="input"
              placeholder="From"
              value={form.from}
              maxLength={50}
              onChange={(e) => setForm({ ...form, from: e.target.value })}
            />
            <div className="edit-actions">
              <button type="button" className="btn-light" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <button className="btn-primary" disabled={saving}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </form>
        )}

        {/* ---- Posts section (composer + quick-create + full post cards) ---- */}
        {tab === "posts" && (
          <>
            {isMe && (
              <>
                {/* Inline composer: text / photo / video posts */}
                <CreatePost onNew={handleNewPost} />
                {/* One-tap quick create: photo post, video post, reel */}
                <div className="card create-bar">
                  <span className="create-bar-label">Quick create</span>
                  <button
                    type="button"
                    className="attach-btn green"
                    onClick={() => setUploadModal("photo")}
                  >
                    <FaImage /> Photo
                  </button>
                  <button
                    type="button"
                    className="attach-btn blue"
                    onClick={() => setUploadModal("video")}
                  >
                    <FaVideo /> Video
                  </button>
                  <button
                    type="button"
                    className="attach-btn yellow"
                    onClick={() => setUploadModal("reel")}
                  >
                    <FaFilm /> Reel
                  </button>
                </div>
              </>
            )}
            <h3 className="section-title">
              {isMe ? "Your posts" : `${profile.username}'s posts`}
            </h3>
            {posts.length === 0 ? (
              <div className="card empty-state">
                {isMe
                  ? "You haven't posted yet — share your first photo!"
                  : "No posts yet."}
              </div>
            ) : (
              posts.map((p) => (
                <Post
                  key={p._id}
                  post={p}
                  onDeleted={(pid) =>
                    setPosts((prev) => prev.filter((x) => x._id !== pid))
                  }
                />
              ))
            )}
          </>
        )}

        {/* ---- Photos section (square grid of every photo post) ---- */}
        {tab === "photos" && (
          photos.length === 0 ? (
            <div className="card empty-state">No photos yet.</div>
          ) : (
            <div className="media-grid">
              {photos.map((p) => (
                <a
                  key={p._id}
                  className="media-cell"
                  href={fileUrl(p.img)}
                  target="_blank"
                  rel="noreferrer"
                  title={p.desc || "Open photo"}
                >
                  <img src={fileUrl(p.img)} alt={p.desc || "Photo"} />
                </a>
              ))}
            </div>
          )
        )}

        {/* ---- Videos section (grid with inline players) ---- */}
        {tab === "videos" && (
          videos.length === 0 ? (
            <div className="card empty-state">No videos yet.</div>
          ) : (
            <div className="media-grid">
              {videos.map((p) => (
                <div key={p._id} className="media-cell">
                  <video
                    src={fileUrl(p.video)}
                    controls
                    playsInline
                    preload="metadata"
                  />
                </div>
              ))}
            </div>
          )
        )}

        {/* ---- Reels section (9:16 video cards -> open the Reels feed) ---- */}
        {tab === "reels" && (
          reels.length === 0 ? (
            <div className="card empty-state">
              No reels yet — upload a video reel!
            </div>
          ) : (
            <div className="pf-reels-grid">
              {reels.map((p) => (
                <Link key={p._id} to="/reels" className="pf-reel" title="Open in Reels">
                  <video src={fileUrl(p.video)} muted playsInline preload="metadata" />
                  <span className="play-badge">
                    <FaPlay />
                  </span>
                </Link>
              ))}
            </div>
          )
        )}

        {/* Quick-create modals (photo post / video post / reel) */}
        {uploadModal && (
          <MediaUploadModal
            title={
              uploadModal === "photo"
                ? "Create photo post"
                : uploadModal === "video"
                ? "Create video post"
                : "Create reel"
            }
            cta={uploadModal === "reel" ? "Share reel" : "Post"}
            videoOnly={uploadModal !== "photo"}
            onClose={() => setUploadModal(null)}
            onCreated={(p) => {
              handleNewPost(p);
              setUploadModal(null);
            }}
          />
        )}
      </div>
    </div>
  );
}