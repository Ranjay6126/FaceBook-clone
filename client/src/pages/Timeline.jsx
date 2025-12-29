import { useEffect, useState } from "react";
import API from "../api";
import CreatePost from "../components/CreatePost";
import Post from "../components/Post";
import Sidebar from "../components/Sidebar";
import Rightbar from "../components/Rightbar";
import Header from "../components/Header";
import { getUser } from "../utils/storage";

export default function Timeline() {
  const [posts, setPosts] = useState([]);

  const curUser = getUser();

  // simple fallback posts so the UI shows something when API/data isn't available
  const samplePosts = [
    { _id: "sample-1", userId: "Demo User", desc: "Welcome to your Facebook clone!" },
    { _id: "sample-2", userId: "Friend", desc: "This is a sample post to make the UI visible." },
  ];

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        if (!curUser) {
          setPosts([]);
          return;
        }
        const res = await API.get(`/posts/timeline/${curUser._id || curUser.id}`);
        setPosts(res.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchTimeline();
  }, []);

  return (
    <div className="page">
      <Header />
      <div className="container">
        <Sidebar />
        <main className="feed">
          <CreatePost onNew={(p) => setPosts([p, ...posts])} />
          <div className="posts">
            {(posts.length ? posts : samplePosts).map((p) => (
              <Post key={p._id} post={p} />
            ))}
          </div>
        </main>
        <Rightbar />
      </div>
    </div>
  );
}
