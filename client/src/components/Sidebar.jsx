import React from "react";
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
} from "react-icons/fa";
import Avatar from "./Avatar";
import { getUser } from "../utils/storage";

const ITEMS = [
  { to: "/", label: "Home", icon: FaHome, end: true },
  { to: "/reels", label: "Reels", icon: FaFilm },
  { to: "/friends", label: "Friends", icon: FaUserFriends },
  { to: "/messages", label: "Messenger", icon: FaFacebookMessenger },
  { to: "/groups", label: "Groups", icon: FaUsers },
  { to: "/marketplace", label: "Marketplace", icon: FaStore },
  { to: "/watch", label: "Watch", icon: FaTv },
  { to: "/memories", label: "Memories", icon: FaHistory },
  { to: "/saved", label: "Saved", icon: FaBookmark },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const user = getUser();

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
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
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
      </ul>
      <div className="sidebar-footer">
        Privacy · Terms · Advertising · Ad Choices · Cookies · More · Meta © 2026
      </div>
    </aside>
  );
}