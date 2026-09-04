import React, { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaFacebook,
  FaSearch,
  FaHome,
  FaTv,
  FaFilm,
  FaStore,
  FaUsers,
  FaFacebookMessenger,
  FaBell,
  FaSignOutAlt,
} from "react-icons/fa";
import Avatar from "./Avatar";
import API from "../api";
import { getUser, removeUser } from "../utils/storage";
import MessengerDropdown from "./MessengerDropdown";
import NotificationsDropdown from "./NotificationsDropdown";

const tabClass = ({ isActive }) => "tab" + (isActive ? " active" : "");

export default function Header() {
  const navigate = useNavigate();
  const user = getUser();
  // Stable primitive so effects don't re-run every render (getUser() returns
  // a brand-new object each time - same pitfall noted in Timeline.jsx).
  const userId = user ? String(user._id || user.id || "") : "";
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const boxRef = useRef(null);
  const msgrRef = useRef(null);
  const notifRef = useRef(null);
  const [showMsgr, setShowMsgr] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [msgBadge, setMsgBadge] = useState(0);
  const [notifBadge, setNotifBadge] = useState(0);

  // Debounced live user search
  useEffect(() => {
    const term = q.trim();
    if (!term) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(() => {
      API.get(`/users/search?q=${encodeURIComponent(term)}`)
        .then((r) => setResults(r.data || []))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  // Close the dropdown when clicking outside
  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) {
        setResults([]);
        setQ("");
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close messenger / notification panels when clicking outside them
  useEffect(() => {
    const onClick = (e) => {
      if (msgrRef.current && !msgrRef.current.contains(e.target))
        setShowMsgr(false);
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifs(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Unread counters for the Messenger + bell badges (polled every 5s).
  // NOTE: depends on primitive userId, NOT getUser() (fresh object each render).
  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    const tick = () => {
      API.get("/messages/unread/count")
        .then((r) => alive && setMsgBadge(r.data?.count || 0))
        .catch(() => {});
      API.get("/notifications/unread/count")
        .then((r) => alive && setNotifBadge(r.data?.count || 0))
        .catch(() => {});
    };
    tick();
    const t = setInterval(tick, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [userId]);

  const goProfile = (id) => {
    setQ("");
    setResults([]);
    navigate(`/profile/${id}`);
  };

  const handleLogout = () => {
    removeUser();
    navigate("/login");
  };

  return (
    <header className="header">
      <div className="header-left">
        <NavLink to="/" className="fb-logo" aria-label="Facebook home">
          <FaFacebook />
        </NavLink>
        <div className="header-search" ref={boxRef}>
          <FaSearch className="search-icon" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search Facebook"
          />
          {results.length > 0 && (
            <div className="search-results card">
              {results.map((u) => (
                <button
                  key={u._id}
                  type="button"
                  className="search-row"
                  onClick={() => goProfile(u._id)}
                >
                  <Avatar src={u.profilePicture} name={u.username} size="avatar-sm" />
                  <span>{u.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav className="header-tabs">
        <NavLink to="/" end className={tabClass} title="Home">
          <FaHome />
        </NavLink>
        <NavLink to="/reels" className={tabClass} title="Reels">
          <FaFilm />
        </NavLink>
        <NavLink to="/watch" className={tabClass} title="Watch">
          <FaTv />
        </NavLink>
        <NavLink to="/marketplace" className={tabClass} title="Marketplace">
          <FaStore />
        </NavLink>
        <NavLink to="/groups" className={tabClass} title="Groups">
          <FaUsers />
        </NavLink>
      </nav>

      <div className="header-right">
        {user ? (
          <>
            <div className="hd-anchor" ref={msgrRef}>
              <button
                className={"icon-btn" + (showMsgr ? " open" : "")}
                title="Messenger"
                type="button"
                onClick={() => {
                  setShowMsgr((v) => !v);
                  setShowNotifs(false);
                }}
              >
                <FaFacebookMessenger />
                {msgBadge > 0 && (
                  <span className="badge">{msgBadge > 9 ? "9+" : msgBadge}</span>
                )}
              </button>
              {showMsgr && <MessengerDropdown onClose={() => setShowMsgr(false)} />}
            </div>
            <div className="hd-anchor" ref={notifRef}>
              <button
                className={"icon-btn" + (showNotifs ? " open" : "")}
                title="Notifications"
                type="button"
                onClick={() => {
                  setShowNotifs((v) => !v);
                  setShowMsgr(false);
                }}
              >
                <FaBell />
                {notifBadge > 0 && (
                  <span className="badge">
                    {notifBadge > 9 ? "9+" : notifBadge}
                  </span>
                )}
              </button>
              {showNotifs && (
                <NotificationsDropdown
                  onClose={() => setShowNotifs(false)}
                  onReadAll={() => setNotifBadge(0)}
                />
              )}
            </div>
            <div
              className="me-chip"
              onClick={() => goProfile(user._id || user.id)}
              role="button"
            >
              <Avatar
                src={user.profilePicture}
                name={user.username}
                size="avatar-xs"
              />
              <span>{user.username}</span>
            </div>
            <button
              className="icon-btn"
              title="Log out"
              type="button"
              onClick={handleLogout}
            >
              <FaSignOutAlt />
            </button>
          </>
        ) : (
          <button
            className="btn-primary"
            type="button"
            onClick={() => navigate("/login")}
          >
            Log in
          </button>
        )}
      </div>
    </header>
  );
}