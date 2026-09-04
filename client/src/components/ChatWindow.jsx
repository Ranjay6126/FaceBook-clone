import React, { useEffect, useRef, useState } from "react";
import {
  FaPhotoVideo,
  FaTimes,
  FaPaperPlane,
  FaPhone,
  FaVideo,
} from "react-icons/fa";
import API, { errMsg, fileUrl } from "../api";
import Avatar from "./Avatar";
import { getUser } from "../utils/storage";
import { useChat } from "../context/ChatContext";
import { useCall } from "../context/CallContext";

function timeLabel(date) {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * One floating Facebook-style chat window (bottom-right dock).
 * Polls the thread every few seconds; reading it also marks
 * the partner's messages as read on the server.
 */
export default function ChatWindow({ partner }) {
  const { closeChat } = useChat();
  const { startCall } = useCall();
  const otherId = String(partner._id || partner.id);
  const me = getUser();
  const myId = me ? String(me._id || me.id) : "";

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // Photo/video attachment being composed
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const fileRef = useRef(null);
  const bodyRef = useRef(null);

  const load = async () => {
    try {
      // GETting the thread also marks the partner's messages as read
      const res = await API.get(`/messages/thread/${otherId}`);
      setMessages(res.data || []);
    } catch {
      /* transient poll errors are silently ignored */
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [otherId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the newest message scrolled into view
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const pickFile = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFile(f);
    setIsVideo(f.type.startsWith("video"));
    setPreview(URL.createObjectURL(f));
  };

  const clearAttachment = () => {
    setFile(null);
    setPreview("");
    setIsVideo(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const send = async (e) => {
    e.preventDefault();
    const body = text.trim();
    if ((!body && !file) || sending) return;
    setSending(true);
    setText("");
    try {
      let res;
      if (file) {
        const fd = new FormData();
        fd.append("receiver", otherId);
        fd.append("text", body);
        fd.append("file", file); // server routes image vs video by mimetype
        res = await API.post("/messages", fd);
        clearAttachment();
      } else {
        res = await API.post("/messages", { receiver: otherId, text: body });
      }
      setMessages((prev) => [...prev, res.data]);
    } catch (err) {
      alert(errMsg(err, "Failed to send message"));
      setText(body); // put the text back so nothing is lost
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-window">
      <div className="chat-head">
        <Avatar src={partner.profilePicture} name={partner.username} size="avatar-sm" />
        <div className="chat-head-name">
          <span className="chat-title">{partner.username}</span>
          <span className="chat-status">Active now</span>
        </div>
        <button
          type="button"
          className="icon-action"
          title="Audio call"
          onClick={() =>
            startCall(
              { _id: otherId, username: partner.username, profilePicture: partner.profilePicture },
              "audio"
            )
          }
        >
          <FaPhone />
        </button>
        <button
          type="button"
          className="icon-action"
          title="Video call"
          onClick={() =>
            startCall(
              { _id: otherId, username: partner.username, profilePicture: partner.profilePicture },
              "video"
            )
          }
        >
          <FaVideo />
        </button>
        <button
          type="button"
          className="icon-action"
          title="Close chat"
          onClick={() => closeChat(otherId)}
        >
          <FaTimes />
        </button>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {messages.length === 0 && (
          <p className="chat-empty">Say hi to {partner.username} 👋</p>
        )}
        {messages.map((m) => {
          const mine = String(m.sender) === myId;
          return (
            <div key={m._id || m.createdAt} className={`chat-row ${mine ? "me" : "you"}`}>
              {!mine && (
                <Avatar src={partner.profilePicture} name={partner.username} size="avatar-xs" />
              )}
              <div className="chat-bubble">
                {m.img && (
                  <img src={fileUrl(m.img)} alt="Photo" className="chat-media" />
                )}
                {m.video && (
                  <video src={fileUrl(m.video)} controls className="chat-media" />
                )}
                {m.text && <span className="chat-text">{m.text}</span>}
                <span className="chat-time">{timeLabel(m.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div className="chat-attach-preview">
          {isVideo ? (
            <video src={preview} muted />
          ) : (
            <img src={preview} alt="Attachment" />
          )}
          <button
            type="button"
            className="preview-remove"
            title="Remove attachment"
            onClick={clearAttachment}
          >
            ✕
          </button>
        </div>
      )}

      <form className="chat-compose" onSubmit={send}>
        <input
          ref={fileRef}
          type="file"
          accept="video/*,image/*"
          hidden
          onChange={pickFile}
        />
        <button
          type="button"
          className="chat-attach"
          title="Send a photo or video"
          onClick={() => fileRef.current && fileRef.current.click()}
        >
          <FaPhotoVideo />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Aa"
          maxLength={2000}
          autoFocus
        />
        <button
          type="submit"
          disabled={(!text.trim() && !file) || sending}
          title="Send"
        >
          <FaPaperPlane />
        </button>
      </form>
    </div>
  );
}
