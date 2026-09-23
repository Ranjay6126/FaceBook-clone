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
  FaUserFriends,
  FaFacebookMessenger,
  FaBell,
  FaSignOutAlt,
  FaBars,
  FaTh,
  FaGamepad,
} from "react-icons/fa";
import Avatar from "./Avatar";
import API from "../api";
import { getUser, removeUser } from "../utils/storage";
import MessengerDropdown from "./MessengerDropdown";
import NotificationsDropdown from "./NotificationsDropdown";

const tabClass = ({ isActive }) => "tab" + (isActive ? " active" : "");
const mnavClass = ({ isActive }) => "m-nav-item" + (isActive ? " active" : "");

export default function Header() {
  const navigate = useNavigate();
  const user = getUser();
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
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

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

  useEffect(() => {
    const onClick = (e) => {
      if (msgrRef.current && !msgrRef.current.contains(e.target))
        setShowMsgr(false);
      if (notifRef.current && !notifRef.current.contains(e.target))
        setShowNotifs(false);
      if (menuRef.current && !menuRef.current.contains(e.target))
        setShowMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

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
    setShowMenu(false);
    navigate(`/profile/${id}`);
  };

  const handleLogout = () => {
    setShowMenu(false);
    removeUser();
    navigate("/login");
  };

  const closePanels = () => {
    setShowMsgr(false);
    setShowNotifs(false);
    setShowMenu(false);
  };

  const formatBadge = (n) => {
    if (n <= 0) return null;
    if (n > 99) return "99+";
    if (n > 9) return `${n}+`;
    return String(n);
  };

  return (
    <header className="header">
      <div className="header-top-row">
        <div className="header-left">
          <NavLink to="/" className="fb-logo" aria-label="Facebook home">
            <FaFacebook />
          </NavLink>
          <span className="fb-wordmark mobile-only">facebook</span>
          <div className="header-search desktop-only" ref={boxRef}>
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

        <nav className="header-tabs desktop-only">
          <NavLink to="/" end className={tabClass} title="Home">
            <FaHome />
          </NavLink>
          <NavLink to="/friends" className={tabClass} title="Friends">
            <FaUserFriends />
          </NavLink>
          <NavLink to="/reels" className={tabClass} title="Reels">
            <FaFilm />
          </NavLink>
          <NavLink to="/marketplace" className={tabClass} title="Marketplace">
            <FaStore />
          </NavLink>
          <NavLink to="/gaming" className={tabClass} title="Gaming">
            <FaGamepad />
          </NavLink>
        </nav>

        <div className="header-right">
          {user ? (
            <>
              <button
                className="icon-btn circle-btn mobile-only"
                title="Search"
                type="button"
                onClick={() => navigate("/")}
              >
                <FaSearch />
              </button>

              <div className="hd-anchor" ref={menuRef}>
                <button
                  className={"icon-btn circle-btn mobile-only" + (showMenu ? " open" : "")}
                  title="Menu"
                  type="button"
                  onClick={() => {
                    setShowMenu((v) => !v);
                    setShowMsgr(false);
                    setShowNotifs(false);
                  }}
                >
                  <FaBars />
                </button>
                {showMenu && (
                  <div className="hd-dropdown m-menu">
                    <div className="hd-head">
                      <h3>Menu</h3>
                    </div>
                    <div className="hd-body">
                      <button
                        className="convo-row"
                        type="button"
                        onClick={() => goProfile(user._id || user.id)}
                      >
                        <Avatar
                          src={user.profilePicture}
                          name={user.username}
                          size="avatar-sm"
                        />
                        <div className="convo-mid">
                          <div className="convo-name">{user.username}</div>
                          <div className="convo-preview">View your profile</div>
                        </div>
                      </button>
                      <hr className="divider" />
                      <button
                        className="convo-row"
                        type="button"
                        onClick={handleLogout}
                      >
                        <span className="notif-chip n-follow">
                          <FaSignOutAlt />
                        </span>
                        <div className="convo-mid">
                          <div className="convo-name">Log out</div>
                          <div className="convo-preview">Sign out of this account</div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                className="apps-btn desktop-only"
                title="Apps"
                type="button"
              >
                <FaTh />
              </button>

              <div className="hd-anchor desktop-only" ref={msgrRef}>
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
                    <span className="badge">{formatBadge(msgBadge)}</span>
                  )}
                </button>
                {showMsgr && <MessengerDropdown onClose={() => setShowMsgr(false)} />}
              </div>

              <div className="hd-anchor desktop-only" ref={notifRef}>
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
                    <span className="badge">{formatBadge(notifBadge)}</span>
                  )}
                </button>
                {showNotifs && (
                  <NotificationsDropdown
                    onClose={() => setShowNotifs(false)}
                    onReadAll={() => setNotifBadge(0)}
                  />
                )}
              </div>

              <button
                className="me-avatar-btn desktop-only"
                title="Your profile"
                type="button"
                onClick={() => goProfile(user._id || user.id)}
              >
                <Avatar
                  src={user.profilePicture}
                  name={user.username}
                  size="avatar-xs"
                />
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
      </div>

      {user && (
        <nav className="mobile-nav-row mobile-only" onClick={closePanels}>
          <NavLink to="/" end className={mnavClass} title="Home">
            <FaHome />
            {msgBadge + notifBadge > 0 && (
              <span className="badge m-badge">{formatBadge(Math.min(15, msgBadge + notifBadge))}</span>
            )}
          </NavLink>
          <NavLink to="/friends" className={mnavClass} title="Friends / Groups">
            <FaUsers />
          </NavLink>
          <NavLink to="/reels" className={mnavClass} title="Reels">
            <FaFilm />
          </NavLink>
          <NavLink to="/messages" className={mnavClass} title="Messenger">
            <FaFacebookMessenger />
            {msgBadge > 0 && (
              <span className="badge m-badge">{formatBadge(msgBadge)}</span>
            )}
          </NavLink>
          <NavLink to="/notifications" className={mnavClass} title="Notifications">
            <FaBell />
            {notifBadge > 0 && (
              <span className="badge m-badge">{formatBadge(notifBadge)}</span>
            )}
          </NavLink>
          <NavLink to="/marketplace" className={mnavClass} title="Marketplace">
            <FaStore />
          </NavLink>
        </nav>
      )}
    </header>
  );
}
