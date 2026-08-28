import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import CreatePost from "../components/CreatePost";
import Post from "../components/Post";
import Sidebar from "../components/Sidebar";
import Rightbar from "../components/Rightbar";
import Header from "../components/Header";
import Stories from "../components/Stories";
import { getUser, setUser } from "../utils/storage";

// Logged-out view: the classic facebook.com landing page with a WORKING login card
function LandingHome() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await API.post("/auth/login", { email, password });
      setUser(res.data);
      window.location.href = "/"; // full reload so the app shell reads the session
    } catch (err) {
      const m =
        err?.response?.data?.message || err?.response?.data || "Login failed";
      setError(typeof m === "string" ? m : JSON.stringify(m));
      setBusy(false);
    }
  };

  return (
    <div className="landing-page">
      <header className="landing-header">
        <h1 className="fb-wordmark landing-wordmark">facebook</h1>
      </header>
      <main className="landing-content">
        <div className="landing-left">
          <h2 className="landing-title">
            Facebook helps you connect and share with the people in your life.
          </h2>
        </div>
        <div className="landing-right">
          <form className="landing-card card" onSubmit={handleLogin}>
            <input
              className="input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="btn-primary btn-block" type="submit" disabled={busy}>
              {busy ? "Logging in..." : "Log In"}
            </button>
            {error && <p className="msg-error">{error}</p>}
            <hr className="divider" />
            <button type="button" className="btn-link">
              Forgotten password?
            </button>
            <hr className="divider" />
            <button
              type="button"
              className="btn-success btn-block"
              onClick={() => navigate("/register")}
            >
              Create New Account
            </button>
          </form>
          <p className="landing-note">
            <strong>Create a Page</strong> for a celebrity, brand or business.
          </p>
        </div>
      </main>
    </div>
  );
}

export default function Timeline() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // FIX: depend on a stable primitive (userId string), NOT on getUser() which
  // returns a brand-new object every render and caused an infinite refetch loop.
  const storedUser = getUser();
  const userId = storedUser ? String(storedUser._id || storedUser.id || "") : "";

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await API.get(`/posts/timeline/${userId}`);
        if (!cancelled) setPosts(res.data || []);
      } catch (err) {
        console.error(err);
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          // Token expired/invalid -> back to login
          localStorage.removeItem("user");
          navigate("/login");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, navigate]);

  if (!userId) return <LandingHome />;

  if (loading) {
    return (
      <div className="page">
        <Header />
        <div style={{ padding: "2rem", textAlign: "center", color: "#65676b" }}>
          Loading...
        </div>
      </div>
    );
  }

  const handleNewPost = (p) => setPosts((prev) => [p, ...prev]);
  const handleDeleted = (id) =>
    setPosts((prev) => prev.filter((x) => x._id !== id));

  return (
    <div className="page">
      <Header />
      <div className="container">
        <Sidebar />
        <main className="feed">
          {/* Keep the post composer at the top of the feed, above Stories. */}
          <CreatePost onNew={handleNewPost} />

          <Stories />

          <div className="posts">
            {posts.length > 0 ? (
              posts.map((p) => (
                <Post key={p._id} post={p} onDeleted={handleDeleted} />
              ))
            ) : (
              <div className="card empty-feed">
                No posts yet. Create your first post or follow someone!
              </div>
            )}
          </div>
        </main>
        <Rightbar />
      </div>
    </div>
  );
}
