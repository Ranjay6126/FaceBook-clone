import React from "react";

export default function Header() {
  return (
    <header className="header">
      <div className="header-left">Facebook Clone</div>
      <div className="header-center">
        <input className="search" placeholder="Search Facebook" />
      </div>
      <div className="header-right">Profile</div>
    </header>
  );
}
