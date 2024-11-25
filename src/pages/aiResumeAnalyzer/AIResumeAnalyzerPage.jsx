import React from "react";
import "./AIResumeAnalyzerPage.css";
import { UploadIcon } from "../../assets/images";
import { TextField } from "@mui/material";

const AIResumeAnalyzerPage = (props) => {
  const setHeaderTitle = () => {
    props.title("AI Resume Analyzer");
    props.subtitle("Choose the job title and paste tags below to find the best candidates.");
  };

  setHeaderTitle();

  return (
    <div className="analyzer-container">
      <div className="upload-container">
        <img className="upload-icon" src={UploadIcon} alt="Upload"/>
        <div className="upload-row">
          <div className="label-container">
            <div className="row1-label">Drag and Drop or choose your file for upload</div>
            <div className="row2-label">Upload multiple resumes for comparison (PDF, DOC, DOCX)</div>
          </div>
          <div className="button-container">
            <button className="browse-button">Browse file</button>
            <button className="import-button">Import from LinkedIn</button>
          </div>
        </div>
      </div>
      <div>
        <div>Job description</div>
        <TextField
          id="input-description"
          placeholder="Paste job description here (optional) - Adding a job description will provide matching analysis"
          multiline
        />
      </div>
    </div>
  );
};

export default AIResumeAnalyzerPage;