import { useState } from "react";
import API from "../api";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [msg, setMsg] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/login", form);
      localStorage.setItem("user", JSON.stringify(res.data));
      setMsg("Logged in");
    } catch (err) {
      setMsg(err?.response?.data || "Error");
    }
  };

  return (
    <div className="auth">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input name="email" placeholder="email" onChange={handleChange} />
        <input name="password" placeholder="password" type="password" onChange={handleChange} />
        <button type="submit">Login</button>
      </form>
      <p>{msg}</p>
    </div>
  );
}
