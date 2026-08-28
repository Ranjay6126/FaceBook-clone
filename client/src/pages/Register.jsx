import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../api";
import { getUser } from "../utils/storage";

export default function Register() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [msg, setMsg] = useState("");
  const [isError, setIsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await API.post("/auth/register", form);
      setIsError(false);
      setMsg("Account created! Redirecting to login...");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Registration failed";
      setIsError(true);
      setMsg(typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg));
      setBusy(false);
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-card card register-card" onSubmit={handleSubmit}>
        <h1 className="fb-wordmark auth-wordmark">facebook</h1>
        <h2 className="auth-title">Create a new account</h2>
        <p className="auth-sub">It's quick and easy.</p>
        <hr className="divider" />
        <input
          className="input"
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={handleChange}
          required
          minLength={3}
          maxLength={20}
        />
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
          placeholder="New password"
          value={form.password}
          onChange={handleChange}
          required
          minLength={6}
        />
        <button className="btn-success btn-block" type="submit" disabled={busy}>
          {busy ? "Creating account..." : "Sign Up"}
        </button>
        {msg && <p className={isError ? "msg-error" : "msg-success"}>{msg}</p>}
        <hr className="divider" />
        <button
          type="button"
          className="btn-link"
          onClick={() => navigate("/login")}
        >
          Already have an account? Log in
        </button>
      </form>
    </div>
  );
}
