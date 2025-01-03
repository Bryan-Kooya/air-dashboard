import React from "react";
import "./HelpPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

const HelpPage = (props) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  (function setHeaderTitle() {
    props.title("Help");
    props.subtitle("Choose the job title and paste tags below to find the best candidates.");
  })();

  return (
    <div className="help-container">
      <h2>Help</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default HelpPage;