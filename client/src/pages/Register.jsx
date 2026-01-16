import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { setUser } from "../utils/storage";

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [msg, setMsg] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/register", form);
      const name = res?.data?.username || res?.data?.user || null;
      setMsg(name ? "Registered: " + name + ". Please login." : "Registered successfully. Please login.");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.response?.data || "Registration failed";
      setMsg(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
    }
  };

  return (
    <div className="auth">
      <div className="landing-logo" style={{ marginBottom: "20px" }}>
        <span className="landing-logo-icon">f</span>
        <span className="landing-logo-text">facebook</span>
      </div>
      <h2>Create a new account</h2>
      <p style={{ color: "#606770", fontSize: "15px", marginBottom: "20px" }}>
        It's quick and easy.
      </p>
      <form onSubmit={handleSubmit}>
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
          minLength={3}
        />
        <input
          name="email"
          type="email"
          placeholder="Email address"
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
          minLength={6}
        />
        <button type="submit">Sign Up</button>
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              navigate("/login");
            }}
            style={{ color: "#1877f2", fontSize: "14px", textDecoration: "none" }}
          >
            Already have an account? Log in
          </a>
        </div>
      </form>
      <p style={{ color: "#ff0000" }}>{msg}</p>
    </div>
  );
}
