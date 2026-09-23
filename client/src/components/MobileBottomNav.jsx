import React, { useState, useRef, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaFilm,
  FaTv,
  FaStore,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaBookmark,
  FaHistory,
  FaUserFriends,
} from "react-icons/fa";
import Avatar from "./Avatar";
import { getUser, removeUser } from "../utils/storage";

const itemClass = ({ isActive }) => "bn-item" + (isActive ? " active" : "");

export default function MobileBottomNav() {
  const navigate = useNavigate();
  const user = getUser();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!user) return null;

  const uid = user._id || user.id;
  const handleLogout = () => {
    setShowMenu(false);
    removeUser();
    navigate("/login");
  };

  return (
    <nav className="mobile-bottom-nav mobile-only" ref={menuRef}>
      <NavLink to="/" end className={itemClass} title="Home">
        <FaHome />
      </NavLink>
      <NavLink to="/reels" className={itemClass} title="Reels">
        <FaFilm />
      </NavLink>
      <NavLink to="/watch" className={itemClass} title="Watch">
        <FaTv />
      </NavLink>
      <NavLink to="/marketplace" className={itemClass} title="Marketplace">
        <FaStore />
      </NavLink>
      <button
        type="button"
        className={"bn-item" + (showMenu ? " active" : "")}
        title="Menu"
        onClick={() => setShowMenu((v) => !v)}
      >
        <FaBars />
      </button>

      {showMenu && (
        <div className="bn-menu-panel card">
          <div className="bn-menu-head">
            <Avatar src={user.profilePicture} name={user.username} size="avatar-sm" />
            <div className="bn-menu-head-mid">
              <div className="bn-menu-name">{user.username}</div>
              <button
                type="button"
                className="bn-menu-sub"
                onClick={() => {
                  setShowMenu(false);
                  navigate(`/profile/${uid}`);
                }}
              >
                View your profile
              </button>
            </div>
          </div>
          <div className="bn-menu-grid">
            <button
              type="button"
              className="bn-menu-row"
              onClick={() => {
                setShowMenu(false);
                navigate(`/profile/${uid}`);
              }}
            >
              <span className="sb-icon"><FaUser /></span>
              <span>Profile</span>
            </button>
            <button
              type="button"
              className="bn-menu-row"
              onClick={() => {
                setShowMenu(false);
                navigate("/friends");
              }}
            >
              <span className="sb-icon"><FaUserFriends /></span>
              <span>Friends</span>
            </button>
            <button
              type="button"
              className="bn-menu-row"
              onClick={() => {
                setShowMenu(false);
                navigate("/saved");
              }}
            >
              <span className="sb-icon"><FaBookmark /></span>
              <span>Saved</span>
            </button>
            <button
              type="button"
              className="bn-menu-row"
              onClick={() => {
                setShowMenu(false);
                navigate("/memories");
              }}
            >
              <span className="sb-icon"><FaHistory /></span>
              <span>Memories</span>
            </button>
          </div>
          <div className="bn-menu-footer">
            <button type="button" className="bn-logout-btn" onClick={handleLogout}>
              <FaSignOutAlt />
              <span>Log out</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
