import React from "react";
import "./MessagesPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

const MessagesPage = (props) => {
  const navigate = useNavigate();

  const setHeaderTitle = () => {
    props.title("Messages");
    props.subtitle("Add new job postings and manage existing ones, streamlining the recruitment process.");
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  setHeaderTitle();

  return (
    <div className="messages-container">
      <h2>Messages</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default MessagesPage;