import React from "react";
import "./MatchCandidatesPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

const MatchCandidatesPage = (props) => {
  const navigate = useNavigate();

  const setHeaderTitle = () => {
    props.title("Match Candidates");
    props.subtitle("Choose the job title and paste tags below to find the best candidates.");
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };
  
  setHeaderTitle();

  return (
    <div className="match-candidates-container">
      <h2>Match Candidates</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default MatchCandidatesPage;