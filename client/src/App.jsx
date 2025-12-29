import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Timeline from "./pages/Timeline";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <nav className="nav">
        <Link to="/">Timeline</Link>
        <Link to="/login">Login</Link>
        <Link to="/register">Register</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Timeline />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
