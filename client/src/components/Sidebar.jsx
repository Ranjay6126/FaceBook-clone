import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  FaHome,
  FaUserFriends,
  FaUsers,
  FaStore,
  FaTv,
  FaFilm,
  FaHistory,
  FaBookmark,
  FaFacebookMessenger,
  FaChevronDown,
  FaChevronUp,
  FaChartBar,
} from "react-icons/fa";
import Avatar from "./Avatar";
import { getUser } from "../utils/storage";

const PRIMARY_ITEMS = [
  { to: "/friends", label: "Friends", icon: FaUserFriends },
  { to: "/", label: "Dashboard", icon: FaChartBar, end: true },
  { to: "/memories", label: "Memories", icon: FaHistory },
  { to: "/saved", label: "Saved", icon: FaBookmark },
  { to: "/groups", label: "Groups", icon: FaUsers },
  { to: "/marketplace", label: "Marketplace", icon: FaStore },
];

const EXTRA_ITEMS = [
  { to: "/reels", label: "Reels", icon: FaFilm },
  { to: "/watch", label: "Watch", icon: FaTv },
  { to: "/messages", label: "Messenger", icon: FaFacebookMessenger },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const user = getUser();
  const [expanded, setExpanded] = useState(false);

  return (
    <aside className="sidebar card">
      <ul>
        {user && (
          <li
            className="sidebar-me"
            onClick={() => navigate(`/profile/${user._id || user.id}`)}
          >
            <Avatar
              src={user.profilePicture}
              name={user.username}
              size="avatar-sm"
            />
            <span>{user.username}</span>
          </li>
        )}
        {PRIMARY_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <li key={label}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) => "sb-link" + (isActive ? " active" : "")}
            >
              <span className="sb-icon">
                <Icon />
              </span>
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
        {expanded &&
          EXTRA_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={label}>
              <NavLink
                to={to}
                className={({ isActive }) => "sb-link" + (isActive ? " active" : "")}
              >
                <span className="sb-icon">
                  <Icon />
                </span>
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        <li>
          <button
            type="button"
            className="sb-link sb-toggle"
            onClick={() => setExpanded((v) => !v)}
          >
            <span className="sb-icon sb-toggle-icon">
              {expanded ? <FaChevronUp /> : <FaChevronDown />}
            </span>
            <span>See {expanded ? "less" : "more"}</span>
          </button>
        </li>
      </ul>
      <div className="sidebar-footer">
        Privacy · Terms · Advertising · Ad Choices · Cookies · More · Meta © 2026
      </div>
    </aside>
  );
}