import React from "react";
import "./MessagesPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

const MessagesPage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="messages-container">
      <h2>Messages</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default MessagesPage;