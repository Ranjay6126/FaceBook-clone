import React, { useEffect, useState } from "react";
import API from "../api";

export default function Rightbar() {
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    // You can fetch actual contacts/friends here
    // For now, showing placeholder
    setContacts([
      { name: "Friend 1", online: true },
      { name: "Friend 2", online: true },
      { name: "Friend 3", online: false },
      { name: "Friend 4", online: true },
    ]);
  }, []);

  return (
    <aside className="rightbar">
      <h4>Contacts</h4>
      <ul>
        {contacts.map((contact, index) => (
          <li key={index}>
            <span style={{ position: "relative" }}>
              {contact.name}
              {contact.online && (
                <span
                  style={{
                    position: "absolute",
                    right: "0",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#31a24c",
                    border: "2px solid #ffffff",
                  }}
                />
              )}
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
