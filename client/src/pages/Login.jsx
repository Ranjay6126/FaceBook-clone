import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { getUser, setUser } from "../utils/storage";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  // Already logged in? Go straight to the feed.
  useEffect(() => {
    if (getUser()) navigate("/", { replace: true });
  }, [navigate]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await API.post("/auth/login", form);
      setUser(res.data);
      navigate("/", { replace: true });
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message || err?.response?.data || "Login failed";
      setMsg(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card card" onSubmit={handleSubmit}>
        <h1 className="fb-wordmark auth-wordmark">facebook</h1>
        <h2 className="auth-title">Log in to Facebook</h2>
        <input
          className="input"
          name="email"
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          className="input"
          name="password"
          type="password"
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button className="btn-primary btn-block" type="submit" disabled={busy}>
          {busy ? "Logging in..." : "Log In"}
        </button>
        {msg && <p className="msg-error">{msg}</p>}
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
    </div>
  );
}