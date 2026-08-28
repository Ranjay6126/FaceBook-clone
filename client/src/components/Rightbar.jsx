import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FaChartLine, FaHeadphones, FaFacebookMessenger } from "react-icons/fa";
import API from "../api";
import Avatar from "./Avatar";
import { getUser } from "../utils/storage";
import { useChat } from "../context/ChatContext";

const DEMO_SUGGESTIONS = [
  { _id: "demo-ava", username: "Ava Patel", isDemo: true },
  { _id: "demo-mateo", username: "Mateo Silva", isDemo: true },
  { _id: "demo-priya", username: "Priya Sharma", isDemo: true },
  { _id: "demo-noah", username: "Noah Williams", isDemo: true },
  { _id: "demo-mei", username: "Mei Chen", isDemo: true },
];

// This account was removed from the Contacts panel at the account owner's request.
const HIDDEN_CONTACT_IDS = new Set(["6a8c2858b0c5997cfa299809"]);

export default function Rightbar() {
  const { openChat } = useChat();
  const [suggestions, setSuggestions] = useState(DEMO_SUGGESTIONS);
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    let cancelled = false;

    // People I follow -> contacts list
    const me = getUser();
    if (me) {
      const ids = me.followings || [];
      Promise.all(
        ids.slice(0, 10).map((id) =>
          API.get(`/users/${id}`).then((r) => r.data).catch(() => null)
        )
      ).then((list) => {
        if (!cancelled) {
          setContacts(
            list.filter(
              (contact) => contact && !HIDDEN_CONTACT_IDS.has(String(contact._id))
            )
          );
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const follow = async (u) => {
    // Suggestions are intentionally placeholder content for the demo UI.
    if (u.isDemo) {
      setSuggestions((prev) => prev.filter((x) => x._id !== u._id));
      return;
    }

    try {
      await API.put(`/users/${u._id}/follow`);
      // Keep the localStorage copy of followings in sync
      const me = getUser();
      if (me) {
        me.followings = [...(me.followings || []), u._id];
        localStorage.setItem("user", JSON.stringify(me));
      }
      setSuggestions((prev) => prev.filter((x) => x._id !== u._id));
      setContacts((prev) => [...prev, u]);
    } catch (err) {
      console.error(err);
      alert(
        err?.response?.data?.message || err?.response?.data || "Failed to follow"
      );
    }
  };

  return (
    <aside className="rightbar">
      <div className="rightbar-section card">
        <h4>Sponsored</h4>
        <div className="sponsored-item">
          <div className="sponsored-thumb">
            <FaChartLine />
          </div>
          <div>
            <div className="sponsored-title">Grow your business</div>
            <div className="sponsored-sub">meta.com</div>
          </div>
        </div>
        <div className="sponsored-item">
          <div className="sponsored-thumb">
            <FaHeadphones />
          </div>
          <div>
            <div className="sponsored-title">Listen anywhere</div>
            <div className="sponsored-sub">music.app</div>
          </div>
        </div>
      </div>

      {contacts.length > 0 && (
        <div className="rightbar-section card">
          <h4>Contacts</h4>
          <ul>
            {contacts.map((c) => (
              <li key={c._id || c.username} className="contact-row">
                <Link to={`/profile/${c._id}`} className="avatar-link">
                  <Avatar src={c.profilePicture} name={c.username} size="avatar-sm" />
                </Link>
                <Link to={`/profile/${c._id}`} className="contact-name">
                  {c.username}
                </Link>
                <button
                  type="button"
                  className="icon-action"
                  title={`Message ${c.username}`}
                  onClick={(e) => {
                    e.preventDefault();
                    openChat({
                      _id: c._id,
                      username: c.username,
                      profilePicture: c.profilePicture,
                    });
                  }}
                >
                  <FaFacebookMessenger />
                </button>
                <span className="online-dot" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="rightbar-section card">
          <h4>Friend suggestions</h4>
          <ul>
            {suggestions.map((u) => (
              <li key={u._id} className="suggest-row">
                <span className="avatar-link">
                  <Avatar name={u.username} size="avatar-sm" />
                </span>
                <span className="suggest-name">
                  {u.username}
                </span>
                <button
                  className="btn-primary btn-mini"
                  onClick={() => follow(u)}
                >
                  Follow
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  );
}
