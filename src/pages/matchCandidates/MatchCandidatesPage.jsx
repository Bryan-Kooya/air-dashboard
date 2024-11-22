import React from "react";
import "./MatchCandidatesPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

const MatchCandidatesPage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="match-candidates-container">
      <h2>Match Candidates</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default MatchCandidatesPage;