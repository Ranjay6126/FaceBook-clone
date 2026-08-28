export function getUser() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to parse user from localStorage", e);
    return null;
  }
}

export function setUser(user) {
  try {
    localStorage.setItem("user", JSON.stringify(user));
  } catch (e) {
    console.warn("Failed to set user to localStorage", e);
  }
}

export function removeUser() {
  try {
    localStorage.removeItem("user");
  } catch (e) {
    console.warn("Failed to remove user from localStorage", e);
  }
}

/* ---- Saved posts (bookmarks, stored per browser) ---- */
const SAVED_KEY = "fb_saved_posts";

export function getSavedIds() {
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export function isPostSaved(id) {
  return getSavedIds().includes(String(id));
}

/** Toggles a post's saved state; returns whether it is now saved. */
export function toggleSavedId(id) {
  let ids = getSavedIds();
  const key = String(id);
  if (ids.includes(key)) ids = ids.filter((x) => x !== key);
  else ids = [key, ...ids];
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  } catch (e) {
    console.warn("Failed to save bookmark", e);
  }
  return ids.includes(key);
}

export function pruneSavedIds(validIds) {
  const valid = new Set(validIds.map(String));
  const kept = getSavedIds().filter((id) => valid.has(id));
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(kept));
  } catch {}
  return kept;
}
