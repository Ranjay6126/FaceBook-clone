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
