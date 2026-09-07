import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaPlus,
  FaSearch,
  FaImage,
  FaTimes,
  FaMapMarkerAlt,
  FaCheck,
  FaTrashAlt,
  FaFacebookMessenger,
  FaPlay,
  FaVideo,
} from "react-icons/fa";
import Header from "../components/Header";
import Avatar from "../components/Avatar";
import API, { fileUrl } from "../api";
import { getUser } from "../utils/storage";
import { timeAgo } from "../utils/time";
import { useChat } from "../context/ChatContext";

const CATS = [
  "All", "Vehicles", "Property Rentals", "Property Sales",
  "Apparel", "Electronics", "Entertainment", "Family",
  "Free Stuff", "Garden", "Hobbies", "Home Goods",
  "Home Improvement", "Musical Instruments", "Office Supplies",
  "Pet Supplies", "Sporting Goods", "Tickets", "Toys & Games",
  "Video Games", "Miscellaneous",
];

const CONDITIONS = [
  "New",
  "Used - Like New",
  "Used - Good",
  "Used - Fair",
  "For parts",
];

const money = (n) =>
  "$" + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

// Store videos may be at most 2 minutes long
const MAX_VIDEO_SECONDS = 120;

/** Read a video file's duration (in seconds) locally, without uploading it. */
function readVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(v.duration);
    };
    v.onerror = () => {
      URL.revokeObjectURL(v.src);
      reject(new Error("unreadable"));
    };
    v.src = URL.createObjectURL(file);
  });
}

/** Listing photo / video, or a friendly placeholder when there's none. */
function Thumb({ listing }) {
  const vidUrl = fileUrl(listing.video);
  if (vidUrl)
    return (
      <span className="mk-video-thumb">
        <video
          src={vidUrl}
          className="mk-img mk-video"
          muted
          playsInline
          preload="metadata"
        />
        <span className="mk-video-badge">
          <FaPlay />
        </span>
      </span>
    );
  const url = fileUrl(listing.img);
  if (url) return <img src={url} alt={listing.title} className="mk-img" />;
  return (
    <span className="mk-img mk-img-ph">
      <FaImage />
    </span>
  );
}

export default function MarketplacePage() {
  const me = getUser();
  const myId = me ? String(me._id || me.id) : "";
  const { openChat } = useChat();

  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("browse"); // browse | mine
  const [detail, setDetail] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = async () => {
    try {
      const res = await API.get("/marketplace");
      setListings(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(() => {
    let list = listings;
    if (tab === "mine") list = list.filter((l) => String(l.seller) === myId);
    if (cat !== "All") list = list.filter((l) => l.category === cat);
    const term = q.trim().toLowerCase();
    if (term)
      list = list.filter(
        (l) =>
          (l.title || "").toLowerCase().includes(term) ||
          (l.desc || "").toLowerCase().includes(term)
      );
    return list;
  }, [listings, tab, cat, q, myId]);

  const markSold = async (listing) => {
    try {
      await API.put(`/marketplace/${listing._id}/sold`);
      const val = !listing.sold;
      setListings((prev) =>
        prev.map((l) => (l._id === listing._id ? { ...l, sold: val } : l))
      );
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Failed to update listing"
      );
    }
  };

  const removeListing = async (listing) => {
    if (!window.confirm("Delete this listing permanently?")) return;
    try {
      await API.delete(`/marketplace/${listing._id}`);
      setListings((prev) => prev.filter((l) => l._id !== listing._id));
      setDetail(null);
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Failed to delete listing"
      );
    }
  };

  const onCreated = (listing) => {
    setListings((prev) => [listing, ...prev]);
    setShowCreate(false);
    setTab("mine"); // jump to Your Listings so the seller sees it immediately
  };

  return (
    <div className="page">
      <Header />
      <div className="mk-layout">
        <aside className="mk-side card">
          <h2 className="mk-brand">Marketplace</h2>
          <button
            type="button"
            className="btn-primary btn-block"
            onClick={() => setShowCreate(true)}
          >
            <FaPlus /> Create new listing
          </button>
          <nav className="mk-cats">
            {CATS.map((c) => (
              <button
                key={c}
                type="button"
                className={
                  "mk-cat" + (tab === "browse" && cat === c ? " active" : "")
                }
                onClick={() => {
                  setCat(c);
                  setTab("browse");
                }}
              >
                <span>{c}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="mk-main">
          <div className="mk-toolbar">
            <div className="mk-tabs">
              <button
                type="button"
                className={tab === "browse" ? "active" : ""}
                onClick={() => setTab("browse")}
              >
                Today&apos;s picks
              </button>
              <button
                type="button"
                className={tab === "mine" ? "active" : ""}
                onClick={() => setTab("mine")}
              >
                Your listings
              </button>
            </div>
            <div className="mk-search">
              <FaSearch />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search Marketplace"
              />
            </div>
          </div>

          {/* Horizontal category chips (main nav on small screens) */}
          <div className="mk-chips">
            {CATS.map((c) => (
              <button
                key={c}
                type="button"
                className={
                  "chip" + (tab === "browse" && cat === c ? " active" : "")
                }
                onClick={() => {
                  setCat(c);
                  setTab("browse");
                }}
              >
                {c}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="muted center">Loading listings…</p>
          ) : visible.length === 0 ? (
            <div className="card empty-state">
              {tab === "mine"
                ? 'You haven\'t listed anything yet. Hit "Create new listing" to sell your first item!'
                : "Nothing for sale in this category yet."}
            </div>
          ) : (
            <div className="mk-grid">
              {visible.map((l) => (
                <button
                  type="button"
                  key={l._id}
                  className="mk-card card"
                  onClick={() => setDetail(l)}
                >
                  <span className="mk-thumb">
                    <Thumb listing={l} />
                    {l.sold && <span className="mk-sold-badge">Sold</span>}
                  </span>
                  <span className="mk-info">
                    <span className="mk-price">{money(l.price)}</span>
                    <span className="mk-title">{l.title}</span>
                    <span className="mk-loc">
                      <FaMapMarkerAlt />{" "}
                      {l.location || l.sellerInfo?.city || "Facebook Marketplace"}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      {showCreate && (
        <CreateListingModal
          onClose={() => setShowCreate(false)}
          onCreated={onCreated}
        />
      )}
      {detail && (
        <ListingDetailModal
          listing={listings.find((x) => x._id === detail._id) || detail}
          myId={myId}
          onClose={() => setDetail(null)}
          onToggleSold={markSold}
          onDelete={removeListing}
          onMessage={(user) => {
            openChat(user);
            setDetail(null);
          }}
        />
      )}
    </div>
  );
}

function CreateListingModal({ onClose, onCreated }) {
  const fileRef = useRef(null);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Miscellaneous");
  const [condition, setCondition] = useState("Used - Good");
  const [location, setLocation] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);

  const pickFile = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (/^video\//.test(f.type)) {
      // Enforce the 2-minute limit before anything is uploaded
      let secs = NaN;
      try {
        secs = await readVideoDuration(f);
      } catch {
        /* handled below */
      }
      if (!Number.isFinite(secs)) {
        alert("Could not read this video's length. Please try another file.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      if (secs > MAX_VIDEO_SECONDS + 0.5) {
        alert(
          `Videos can be at most ${MAX_VIDEO_SECONDS / 60} minutes long ` +
            `(yours is ${Math.round(secs)}s). Please trim it and try again.`
        );
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const clearFile = () => {
    setFile(null);
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async (e) => {
    e.preventDefault();
    const t = title.trim();
    const p = Number(price);
    if (!t) return alert("Please add a title.");
    if (!Number.isFinite(p) || p < 0) return alert("Please add a valid price.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", t);
      fd.append("price", String(p));
      fd.append("category", category);
      fd.append("condition", condition);
      fd.append("location", location.trim());
      fd.append("desc", desc.trim());
      if (file) fd.append("img", file);
      const res = await API.post("/marketplace", fd);
      onCreated(res.data);
    } catch (err) {
      alert(
        err?.response?.data?.message ||
          err?.response?.data ||
          "Failed to create listing"
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form className="modal-card mk-create card" onSubmit={submit}>
        <div className="modal-head">
          <h3>Create new listing</h3>
          <button type="button" className="icon-action" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <div className="mk-photo-row">
          {preview ? (
            <div className="mk-photo-preview">
              {file && /^video\//.test(file.type) ? (
                <video
                  src={preview}
                  className="mk-preview-video"
                  controls
                  muted
                  playsInline
                />
              ) : (
                <img src={preview} alt="Preview" />
              )}
              <button
                type="button"
                className="preview-remove"
                onClick={clearFile}
                title="Remove media"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="mk-photo-add"
              onClick={() => fileRef.current && fileRef.current.click()}
            >
              <FaVideo />
              <span>Add photo or video</span>
              <small>Videos: max 2 minutes</small>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={pickFile}
          />
        </div>

        <input
          className="input"
          placeholder="Title (e.g. Mountain bike, barely used)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
        />
        <div className="mk-two-col">
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            placeholder="Price ($)"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          <select
            className="input"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
          >
            {CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <select
          className="input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATS.filter((c) => c !== "All").map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input
          className="input"
          placeholder="Location (e.g. Springfield, IL)"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          maxLength={60}
        />
        <textarea
          className="input"
          rows={3}
          placeholder="Description (optional)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          maxLength={1000}
        />

        <div className="modal-actions">
          <button type="button" className="btn-light" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Publishing…" : "Publish listing"}
          </button>
        </div>
      </form>
    </div>
  );
}

function ListingDetailModal({
  listing,
  myId,
  onClose,
  onToggleSold,
  onDelete,
  onMessage,
}) {
  const s = listing.sellerInfo || null;
  const mine = s ? String(s._id) === myId : String(listing.seller) === myId;
  const vidUrl = fileUrl(listing.video);
  const url = vidUrl || fileUrl(listing.img);

  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-card mk-detail card">
        <button
          type="button"
          className="modal-close icon-action"
          onClick={onClose}
          title="Close"
        >
          <FaTimes />
        </button>

        <div className="mk-detail-grid">
          <div className={"mk-detail-media" + (!url ? " ph" : "")}>
            {vidUrl ? (
              <video
                src={vidUrl}
                className="mk-detail-video"
                controls
                playsInline
              />
            ) : url ? (
              <img src={url} alt={listing.title} />
            ) : (
              <FaImage />
            )}
            {listing.sold && <span className="mk-sold-badge big">Sold</span>}
          </div>

          <div className="mk-detail-info">
            <h3 className="mk-d-title">{listing.title}</h3>
            <div className="mk-d-price">{money(listing.price)}</div>
            <div className="mk-d-meta">
              <span>Listed {timeAgo(listing.createdAt)}</span>
              <span>·</span>
              <span>{listing.condition}</span>
              <span>·</span>
              <span>{listing.category}</span>
            </div>

            {listing.desc && <p className="mk-d-desc">{listing.desc}</p>}

            <div className="mk-d-location">
              <FaMapMarkerAlt />{" "}
              {listing.location || s?.city || "No location given"}
            </div>

            <hr className="divider" />

            {s && (
              <div className="mk-seller">
                <Link
                  to={`/profile/${s._id}`}
                  className="avatar-link"
                  onClick={onClose}
                >
                  <Avatar
                    src={s.profilePicture}
                    name={s.username}
                    size="avatar-sm"
                  />
                </Link>
                <div className="mk-seller-name">
                  <Link to={`/profile/${s._id}`} onClick={onClose}>
                    {s.username}
                  </Link>
                  <span>Marketplace seller</span>
                </div>
              </div>
            )}

            {mine ? (
              <div className="mk-d-actions">
                <button
                  type="button"
                  className={listing.sold ? "btn-light" : "btn-success"}
                  onClick={() => onToggleSold(listing)}
                >
                  <FaCheck />{" "}
                  {listing.sold ? "Mark as available" : "Mark as sold"}
                </button>
                <button
                  type="button"
                  className="btn-light danger"
                  onClick={() => onDelete(listing)}
                >
                  <FaTrashAlt /> Delete
                </button>
              </div>
            ) : (
              <div className="mk-d-actions">
                <button
                  type="button"
                  className="btn-primary btn-block"
                  disabled={!s}
                  onClick={() =>
                    s &&
                    onMessage({
                      _id: s._id,
                      username: s.username,
                      profilePicture: s.profilePicture,
                    })
                  }
                >
                  <FaFacebookMessenger /> Message seller
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


