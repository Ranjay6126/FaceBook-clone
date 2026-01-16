import React from "react";
import { getUser } from "../utils/storage";

export default function Sidebar() {
  const user = getUser();

  return (
    <aside className="sidebar">
      <ul>
        <li>
          <span>Home</span>
        </li>
        <li>
          <span>Friends</span>
        </li>
        <li>
          <span>Groups</span>
        </li>
        <li>
          <span>Marketplace</span>
        </li>
        <li>
          <span>Watch</span>
        </li>
        <li>
          <span>Memories</span>
        </li>
        <li>
          <span>Saved</span>
        </li>
        {user && (
          <li>
            <span>{user.username || "Profile"}</span>
          </li>
        )}
      </ul>
    </aside>
  );
}
