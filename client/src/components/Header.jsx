import React from "react";
import { useNavigate } from "react-router-dom";
import { getUser } from "../utils/storage";

export default function Header() {
  const navigate = useNavigate();
  const user = getUser();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <header className="header">
      <div className="header-left" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
        <span style={{ fontSize: "28px", fontWeight: "700", color: "#1877f2" }}>f</span>
        <span style={{ marginLeft: "8px", fontSize: "20px", fontWeight: "600" }}>Facebook</span>
      </div>
      <div className="header-center">
        <input className="search" type="text" placeholder="Search Facebook" />
      </div>
      <div className="header-right">
        {user ? (
          <>
            <span>{user.username || "User"}</span>
            <button
              onClick={handleLogout}
              style={{
                background: "#e4e6eb",
                color: "#050505",
                padding: "6px 12px",
                fontSize: "14px",
                marginLeft: "8px",
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <button
            onClick={() => navigate("/login")}
            style={{
              background: "#1877f2",
              color: "#ffffff",
              padding: "6px 16px",
              fontSize: "14px",
            }}
          >
            Login
          </button>
        )}
      </div>
    </header>
  );
}
