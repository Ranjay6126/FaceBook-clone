import React, { useEffect, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaFacebookMessenger,
  FaPaperPlane,
  FaPhotoVideo,
} from "react-icons/fa";
import Header from "../components/Header";
import Avatar from "../components/Avatar";
import API, { errMsg, fileUrl } from "../api";
import { getUser } from "../utils/storage";
import { timeAgo } from "../utils/time";

/** Full-page Facebook-style inbox: conversation list + message thread. */
export default function MessagesPage() {
  const me = getUser();
  const myId = me ? String(me._id || me.id) : "";

  const [convos, setConvos] = useState([]);
  const [active, setActive] = useState(null); // partner user object
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  // Photo/video attachment being composed
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const fileRef = useRef(null);
  const bodyRef = useRef(null);

  const activeId = active ? String(active._id || active.id) : "";

  const loadConvos = async () => {
    try {
      const r = await API.get("/messages/conversations");
      setConvos(r.data || []);
    } catch {
      /* ignore transient poll errors */
    }
  };

  useEffect(() => {
    loadConvos();
    const t = setInterval(loadConvos, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return undefined;
    }
    const load = async () => {
      try {
        // GETting the thread also marks the partner's messages as read
        const r = await API.get(`/messages/thread/${activeId}`);
        setMessages(r.data || []);
      } catch {
        /* ignore transient poll errors */
      }
    };
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [activeId]);

  // Keep the newest message scrolled into view
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, activeId]);

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
    if ((!body && !file) || sending || !activeId) return;
    setSending(true);
    setText("");
    try {
      let res;
      if (file) {
        const fd = new FormData();
        fd.append("receiver", activeId);
        fd.append("text", body);
        fd.append("file", file); // server routes image vs video by mimetype
        res = await API.post("/messages", fd);
        clearAttachment();
      } else {
        res = await API.post("/messages", { receiver: activeId, text: body });
      }
      setMessages((prev) => [...prev, res.data]);
      loadConvos(); // refresh sidebar preview instantly
    } catch (err) {
      alert(errMsg(err, "Failed to send message"));
      setText(body);
    } finally {
      setSending(false);
    }
  };

  const previewOf = (c) =>
    c.lastMessage
      ? `${c.lastMessage.mine ? "You: " : ""}${c.lastMessage.text}`
      : "Say hello!";

  return (
    <div className="page">
      <Header />
      <div className={`inbox${activeId ? " thread-open" : ""}`}>
        <aside className="inbox-list card">
          <div className="inbox-head">
            <h3>Chats</h3>
          </div>
          <div className="inbox-scroll">
            {convos.length === 0 && (
              <p className="hd-empty pad">
                No chats yet. Search for people in the Messenger panel or
                message sellers from Marketplace!
              </p>
            )}
            {convos.map((c) => (
              <button
                type="button"
                key={c.partner._id}
                className={
                  "convo-row" +
                  (activeId === String(c.partner._id) ? " active" : "")
                }
                onClick={() => setActive(c.partner)}
              >
                <span className="convo-avatar-wrap">
                  <Avatar src={c.partner.profilePicture} name={c.partner.username} />
                  <span className="online-dot" />
                </span>
                <span className="convo-mid">
                  <span className={`convo-name${c.unread > 0 ? " unread" : ""}`}>
                    {c.partner.username}
                  </span>
                  <span className="convo-preview">{previewOf(c)}</span>
                </span>
                {c.lastMessage && (
                  <span className="convo-time">
                    {timeAgo(c.lastMessage.createdAt)}
                  </span>
                )}
                {c.unread > 0 && <span className="unread-dot" />}
              </button>
            ))}
          </div>
        </aside>
        <section className="inbox-thread card">
          {!active ? (
            <div className="inbox-placeholder">
              <FaFacebookMessenger className="inbox-big-icon" />
              <p>Your messages</p>
              <span>Pick a chat on the left to start talking.</span>
            </div>
          ) : (
            <>
              <div className="thread-head">
                <button
                  type="button"
                  className="icon-action back-btn"
                  title="Back to chats"
                  onClick={() => setActive(null)}
                >
                  <FaArrowLeft />
                </button>
                <Avatar
                  src={active.profilePicture}
                  name={active.username}
                  size="avatar-sm"
                />
                <span className="thread-name">{active.username}</span>
                <span className="online-dot" />
              </div>

              <div className="chat-body thread-body" ref={bodyRef}>
                {messages.length === 0 && (
                  <p className="chat-empty">Say hi to {active.username} 👋</p>
                )}
                {messages.map((m) => {
                  const mine = String(m.sender) === myId;
                  return (
                    <div
                      key={m._id || m.createdAt}
                      className={`chat-row ${mine ? "me" : "you"}`}
                    >
                      {!mine && (
                        <Avatar
                          src={active.profilePicture}
                          name={active.username}
                          size="avatar-xs"
                        />
                      )}
                      <div className="chat-bubble">
                        {m.img && (
                          <img
                            src={fileUrl(m.img)}
                            alt="Photo"
                            className="chat-media"
                          />
                        )}
                        {m.video && (
                          <video
                            src={fileUrl(m.video)}
                            controls
                            className="chat-media"
                          />
                        )}
                        {m.text && <span className="chat-text">{m.text}</span>}
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
                />
                <button
                  type="submit"
                  disabled={(!text.trim() && !file) || sending}
                  title="Send"
                >
                  <FaPaperPlane />
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
