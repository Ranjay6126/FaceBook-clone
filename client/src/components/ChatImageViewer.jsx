import React, { useEffect } from "react";
import { FaTimes } from "react-icons/fa";

export default function ChatImageViewer({ src, onClose }) {
  useEffect(() => {
    if (!src) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [src, onClose]);

  if (!src) return null;
  return (
    <div className="chat-image-viewer" onClick={onClose}>
      <button type="button" aria-label="Close image" title="Close" onClick={onClose}>
        <FaTimes />
      </button>
      <img src={src} alt="Full size message attachment" onClick={(event) => event.stopPropagation()} />
    </div>
  );
}
