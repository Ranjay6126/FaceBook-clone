import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import CreatePost from "../components/CreatePost";
import Post from "../components/Post";
import Sidebar from "../components/Sidebar";
import Rightbar from "../components/Rightbar";
import Header from "../components/Header";
import { getUser } from "../utils/storage";

export default function Timeline() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const curUser = getUser();

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        if (!curUser) {
          setPosts([]);
          setLoading(false);
          return;
        }
        if (!curUser._id && !curUser.id) {
          setPosts([]);
          setLoading(false);
          return;
        }
        const res = await API.get(`/posts/timeline/${curUser._id || curUser.id}`);
        setPosts(res.data || []);
      } catch (err) {
        console.error(err);
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          // Token expired or invalid, redirect to login
          localStorage.removeItem("user");
          navigate("/login");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, [curUser, navigate]);

  if (!curUser) {
    return (
      <div className="landing-page">
        <div className="landing-header">
          <div className="landing-logo">
            <span className="landing-logo-icon">f</span>
            <span className="landing-logo-text">facebook</span>
          </div>
        </div>
        <div className="landing-content">
          <div className="landing-left">
            <h1 className="landing-title">Facebook helps you connect and share with the people in your life.</h1>
          </div>
          <div className="landing-right">
            <div className="landing-card">
              <h2 style={{ fontSize: "32px", fontWeight: "600", marginBottom: "8px", color: "#1c1e21" }}>
                Welcome to Facebook
              </h2>
              <p style={{ fontSize: "15px", color: "#606770", marginBottom: "20px" }}>
                Connect with friends and the world around you.
              </p>
              <div className="landing-buttons">
                <button
                  onClick={() => navigate("/login")}
                  className="landing-btn login-btn"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="landing-btn signup-btn"
                >
                  Create New Account
                </button>
              </div>
              <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "1px solid #dadde1" }}>
                <p style={{ fontSize: "14px", color: "#1877f2", textAlign: "center", cursor: "pointer" }}>
                  Create a Page for a celebrity, brand or business.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page">
        <Header />
        <div style={{ padding: "2rem", textAlign: "center", color: "#65676b" }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <Header />
      <div className="container">
        <Sidebar />
        <main className="feed">
          <CreatePost onNew={(p) => setPosts([p, ...posts])} />
          <div className="posts">
            {posts.length > 0 ? (
              posts.map((p) => <Post key={p._id} post={p} />)
            ) : (
              <div
                style={{
                  padding: "2rem",
                  textAlign: "center",
                  background: "#ffffff",
                  borderRadius: "8px",
                  color: "#65676b",
                }}
              >
                No posts yet. Create your first post!
              </div>
            )}
          </div>
        </main>
        <Rightbar />
      </div>
    </div>
  );
}
