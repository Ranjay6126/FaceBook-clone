import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { setUser } from "../utils/storage";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", form);
      setUser(res.data);
      setMsg("Logged in successfully!");
      setTimeout(() => {
        navigate("/");
      }, 1000);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.response?.data || "Login failed";
      setMsg(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  return (
    <div className="auth">
      <div className="landing-logo" style={{ marginBottom: "20px" }}>
        <span className="landing-logo-icon">f</span>
        <span className="landing-logo-text">facebook</span>
      </div>
      <h2>Log in to Facebook</h2>
      <form onSubmit={handleSubmit}>
        <input
          name="email"
          type="email"
          placeholder="Email address or phone number"
          value={form.email}
          onChange={handleChange}
          required
        />
        <input
          name="password"
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={handleChange}
          required
        />
        <button type="submit">Log In</button>
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <a
            href="#"
            style={{ color: "#1877f2", fontSize: "14px", textDecoration: "none" }}
          >
            Forgotten password?
          </a>
        </div>
        <div style={{ borderTop: "1px solid #dadde1", marginTop: "20px", paddingTop: "20px" }}>
          <button
            type="button"
            onClick={() => navigate("/register")}
            style={{
              background: "#42b72a",
              color: "#ffffff",
              padding: "12px",
              borderRadius: "6px",
              fontWeight: "600",
              fontSize: "16px",
              width: "100%",
            }}
          >
            Create New Account
          </button>
        </div>
      </form>
      <p style={{ color: "#ff0000" }}>{msg}</p>
    </div>
  );
}
