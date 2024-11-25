import React from "react";
import "./JobPostingsPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

const JobPostingsPage = (props) => {
  const navigate = useNavigate();

  const setHeaderTitle = () => {
    props.title("Job Postings");
    props.subtitle("Add new job postings and manage existing ones, streamlining the recruitment process.");
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  setHeaderTitle();

  return (
    <div className="job-postings-container">
      <h2>Job Postings</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default JobPostingsPage;