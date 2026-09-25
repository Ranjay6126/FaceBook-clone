import React, { useCallback, useEffect, useState } from "react";
import { FaCheckDouble, FaFacebookMessenger, FaRegComment, FaThumbsUp, FaUserPlus } from "react-icons/fa";
import Header from "../components/Header";
import Avatar from "../components/Avatar";
import API from "../api";
import { timeAgo } from "../utils/time";

const meta = {
  follow: { Icon: FaUserPlus, phrase: "started following you", cls: "n-follow" },
  like: { Icon: FaThumbsUp, phrase: "liked your post", cls: "n-like" },
  comment: { Icon: FaRegComment, phrase: "commented on your post", cls: "n-comment" },
  message: { Icon: FaFacebookMessenger, phrase: "sent you a message", cls: "n-message" },
};

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const response = await API.get("/notifications");
      setItems(response.data || []);
    } catch {
      // Keep the page usable during temporary network failures.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markAll = async () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    await API.put("/notifications/read-all").catch(() => {});
  };

  return (
    <div className="page">
      <Header />
      <main className="notifications-page card">
        <div className="notifications-page-head">
          <h2>Notifications</h2>
          <button type="button" className="hd-link as-btn" onClick={markAll}>
            <FaCheckDouble /> Mark all read
          </button>
        </div>
        {loading ? <p className="hd-empty">Loading notifications…</p> : items.length === 0 ? (
          <p className="hd-empty">No notifications yet. Friend activity, likes and comments will show here.</p>
        ) : (
          <div className="notifications-page-list">
            {items.map((item) => {
              const detail = meta[item.type] || meta.follow;
              const Icon = detail.Icon;
              const sender = item.senderInfo || {};
              const message = item.type === "comment" && item.text
                ? `commented: “${item.text}”`
                : item.type === "message" && item.text
                  ? `sent you a message: “${item.text}”`
                  : detail.phrase;
              return (
                <div key={item._id} className={`notif-row${item.read ? "" : " unread"}`}>
                  <Avatar src={sender.profilePicture} name={sender.username || "U"} />
                  <p className="notif-text"><b>{sender.username || "Someone"}</b> {message}</p>
                  <span className="notif-time">{timeAgo(item.createdAt)}</span>
                  <span className={`notif-chip ${detail.cls}`}><Icon /></span>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
