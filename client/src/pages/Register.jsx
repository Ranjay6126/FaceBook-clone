import { useState } from "react";
import API from "../api";

export default function Register() {
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [msg, setMsg] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/auth/register", form);
      const name = res?.data?.username || res?.data?.user || null;
      setMsg(name ? "Registered: " + name : "Registered successfully");
    } catch (err) {
      setMsg(err?.response?.data || "Error");
    }
  };

  return (
    <div className="auth">
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input name="username" placeholder="username" onChange={handleChange} />
        <input name="email" placeholder="email" onChange={handleChange} />
        <input name="password" placeholder="password" type="password" onChange={handleChange} />
        <button type="submit">Register</button>
      </form>
      <p>{msg}</p>
    </div>
  );
}
