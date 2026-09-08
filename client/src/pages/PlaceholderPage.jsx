import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUsers, FaStore } from "react-icons/fa";

export default function PlaceholderPage({ kind, title, text }) {
  const navigate = useNavigate();
  const Icon = kind === "groups" ? FaUsers : FaStore;

  return (
    <div className="page">
      <div className="placeholder-page card">
        <Icon className="placeholder-icon" />
        <h2>{title}</h2>
        <p>{text}</p>
        <button className="btn-primary" onClick={() => navigate("/")}>
          Back to Home
        </button>
      </div>
    </div>
  );
}