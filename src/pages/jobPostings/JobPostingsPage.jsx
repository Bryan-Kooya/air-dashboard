import React from "react";
import "./JobPostingsPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

const JobPostingsPage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="job-postings-container">
      <h2>Job Postings</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default JobPostingsPage;