import React from "react";
import "./JobPostingsPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { TextField } from "@mui/material";

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
      <div className="add-job-card">
        <div className="job-card-title">Add a New Job</div>
        <div className="card-row">
          <div className="row-title">Job Title:</div>
          <input 
            placeholder="e.g., Frontend Developer"
            className="job-title-input"
          />
        </div>
        <div className="card-row">
          <div className="row-title">Job Description</div>
          <TextField
            id="job-description"
            placeholder="Paste job description here (optional) - Adding a job description will provide matching analysis"
            multiline
          />
        </div>
        <button className="add-job-button">Add Job</button>
      </div>
    </div>
  );
};

export default JobPostingsPage;