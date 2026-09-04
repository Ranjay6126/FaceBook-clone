import React from "react";
import ChatWindow from "./ChatWindow";
import { useChat } from "../context/ChatContext";
import { getUser } from "../utils/storage";

/** Renders every open chat window side-by-side at the bottom-right of the screen. */
export default function ChatDock() {
  const { chats } = useChat();
  if (!getUser()) return null;
  if (!chats.length) return null;

  return (
    <div className="chat-dock">
      {chats.map((c) => (
        <ChatWindow key={String(c._id || c.id)} partner={c} />
      ))}
    </div>
  );
}
