import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import API from "../api";
import Avatar from "./Avatar";
import { useChat } from "../context/ChatContext";
import { timeAgo } from "../utils/time";

/**
 * Header "Messenger" panel: recent conversations + people search.
 * Picking anyone pops open a floating chat window via the ChatContext.
 */
export default function MessengerDropdown({ onClose }) {
  const { openChat } = useChat();
  const [convos, setConvos] = useState([]);
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const rootRef = useRef(null);

  // Close when clicking anywhere outside the panel
  useEffect(() => {
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onClose]);

  // Recent conversations
  useEffect(() => {
    let alive = true;
    API.get("/messages/conversations")
      .then((r) => alive && setConvos(r.data || []))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Debounced live people search
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

  const open = (user) => {
    openChat(user);
    onClose();
  };

  return (
    <div className="hd-dropdown messenger-panel" ref={rootRef}>
      <div className="hd-head">
        <h3>Chat</h3>
        <Link to="/messages" className="hd-link" onClick={onClose}>
          See all
        </Link>
      </div>

      <div className="hd-search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people to message"
        />
      </div>

      <div className="hd-body">
        {q.trim() ? (
          results.length > 0 ? (
            results.map((u) => (
              <button
                key={u._id}
                type="button"
                className="convo-row"
                onClick={() => open(u)}
              >
                <Avatar src={u.profilePicture} name={u.username} />
                <span className="convo-mid">
                  <span className="convo-name">{u.username}</span>
                </span>
              </button>
            ))
          ) : (
            <p className="hd-empty">No people found.</p>
          )
        ) : convos.length > 0 ? (
          convos.map((c) => (
            <button
              key={c.partner._id}
              type="button"
              className="convo-row"
              onClick={() => open(c.partner)}
            >
              <span className="convo-avatar-wrap">
                <Avatar src={c.partner.profilePicture} name={c.partner.username} />
                <span className="online-dot" />
              </span>
              <span className="convo-mid">
                <span className={`convo-name${c.unread > 0 ? " unread" : ""}`}>
                  {c.partner.username}
                </span>
                <span className="convo-preview">
                  {c.lastMessage
                    ? `${c.lastMessage.mine ? "You: " : ""}${c.lastMessage.text}`
                    : "Say hello!"}
                </span>
              </span>
              {c.lastMessage && (
                <span className="convo-time">{timeAgo(c.lastMessage.createdAt)}</span>
              )}
              {c.unread > 0 && <span className="unread-dot" />}
            </button>
          ))
        ) : (
          <p className="hd-empty">
            No conversations yet.
            <br />
            Search for someone to say hi!
          </p>
        )}
      </div>
    </div>
  );
}
