import React from "react";
import "./HelpPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

const HelpPage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="help-container">
      <h2>Help</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default HelpPage;