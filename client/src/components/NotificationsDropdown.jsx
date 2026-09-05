import React, { useEffect, useRef, useState } from "react";
import {
  FaUserPlus,
  FaThumbsUp,
  FaRegComment,
  FaFacebookMessenger,
  FaCheckDouble,
} from "react-icons/fa";
import API from "../api";
import Avatar from "./Avatar";
import { timeAgo } from "../utils/time";

const TYPE_META = {
  follow: { Icon: FaUserPlus, phrase: "started following you", cls: "n-follow" },
  like: { Icon: FaThumbsUp, phrase: "liked your post", cls: "n-like" },
  comment: { Icon: FaRegComment, phrase: "", cls: "n-comment" },
  message: { Icon: FaFacebookMessenger, phrase: "", cls: "n-message" },
};

function phrase(n) {
  if (n.type === "comment")
    return n.text ? `commented: “${n.text}”` : "commented on your post.";
  if (n.type === "message")
    return n.text ? `sent you a message: “${n.text}”` : "sent you a message.";
  return TYPE_META[n.type]?.phrase || "interacted with you";
}

/** Header bell dropdown: friend requests + post likes / comments only. */
const BELL_TYPES = ["follow", "like", "comment"];

export default function NotificationsDropdown({ onClose, onReadAll }) {
  const [items, setItems] = useState([]);
  const rootRef = useRef(null);

  useEffect(() => {
    let alive = true;
    API.get("/notifications")
      .then((r) => {
        if (!alive) return;
        // Defense in depth: the server already filters these out
        setItems((r.data || []).filter((n) => BELL_TYPES.includes(n.type)));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Close when clicking anywhere outside the panel
  useEffect(() => {
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    onReadAll && onReadAll();
    try {
      await API.put("/notifications/read-all");
    } catch {
      /* badge already cleared locally; next poll self-heals */
    }
  };

  return (
    <div className="hd-dropdown notif-panel" ref={rootRef}>
      <div className="hd-head">
        <h3>Notifications</h3>
        <button type="button" className="hd-link as-btn" onClick={markAll}>
          <FaCheckDouble /> Mark all read
        </button>
      </div>

      <div className="hd-body">
        {items.length === 0 ? (
          <p className="hd-empty">
            No notifications yet.
            <br />
            Friend requests, likes and comments land here.
          </p>
        ) : (
          items.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.follow;
            const s = n.senderInfo || {};
            return (
              <div key={n._id} className={`notif-row${n.read ? "" : " unread"}`}>
                <Avatar src={s.profilePicture} name={s.username || "U"} />
                <p className="notif-text">
                  <b>{s.username || "Someone"}</b> {phrase(n)}
                </p>
                <span className="notif-time">{timeAgo(n.createdAt)}</span>
                <span className={`notif-chip ${meta.cls}`}>
                  <meta.Icon />
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
