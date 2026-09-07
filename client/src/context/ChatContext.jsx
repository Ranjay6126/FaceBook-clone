import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Global state for the floating Messenger chat windows.
 * Any component can call openChat(user) to pop open a chat window —
 * header dropdown, Marketplace "Message Seller", contacts list, …
 */
const ChatContext = createContext(null);

const MAX_OPEN_CHATS = 4;

export function ChatProvider({ children }) {
  const [chats, setChats] = useState([]); // [{ _id, username, profilePicture }]

  const openChat = useCallback((user) => {
    if (!user) return;
    const id = String(user._id || user.id || "");
    if (!id) return;
    setChats((prev) => {
      if (prev.some((c) => String(c._id || c.id) === id)) return prev;
      const next = [...prev, user];
      // Never show more than MAX windows — drop the oldest ones
      return next.slice(Math.max(0, next.length - MAX_OPEN_CHATS));
    });
  }, []);

  const closeChat = useCallback((id) => {
    setChats((prev) =>
      prev.filter((c) => String(c._id || c.id) !== String(id))
    );
  }, []);

  const value = useMemo(
    () => ({ chats, openChat, closeChat }),
    [chats, openChat, closeChat]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside <ChatProvider>");
  return ctx;
}
