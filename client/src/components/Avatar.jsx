import React from "react";
import { fileUrl } from "../api";

/**
 * Reusable avatar: shows the profile picture if the user uploaded one,
 * otherwise a blue circle with the first letter of the name.
 */
export default function Avatar({ src, name = "U", size = "", loading = "lazy" }) {
  const cls = "avatar" + (size ? " " + size : "");
  const url = fileUrl(src);
  if (url) {
    return <img className={`${cls} avatar-img`} src={url} alt={name || "User"} loading={loading} decoding="async" />;
  }
  return <span className={cls}>{(name || "U").charAt(0).toUpperCase()}</span>;
}
