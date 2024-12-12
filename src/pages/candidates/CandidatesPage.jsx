import React, { useState, useEffect } from "react";
import { UploadIcon } from "../../assets/images";
import "./CandidatesPage.css";
import { useDropzone } from 'react-dropzone';
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import matchCandidates from "../../utils/matchCandidates.json";

const candidates = [
  {name: "John Smith", job: "Frontend Developer", status: "Waiting for approval", experience: "5 years", attachments: "CV_Frontend_Dev.pdf"},
  {name: "Alice Norman", job: "HR", status: "Selected", experience: "6 years", attachments: "CV_Frontend_Dev.pdf"},
  {name: "Ryan Rey", job: "UI/UX Designer", status: "Interviewed", experience: "3 years", attachments: "CV_Frontend_Dev.pdf"},
  {name: "Melissa Moore", job: "Business Manager", status: "Salary draft", experience: "10 years", attachments: "CV_Frontend_Dev.pdf"},
  {name: "Justine Green", job: "QA Engineer", status: "Selected", experience: "4 years", attachments: "CV_Frontend_Dev.pdf"},
];

const CandidatesPage = (props) => {
  const tableHeader = ["Candidate", "Job", "Job", "Experience", "Attachments"];
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const [viewDetails, setViewDetails] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState([]);

  const onDrop = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
    setError(null);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: '.pdf, .doc, .docx',
    multiple: false,
  });

  const handleViewDetails = (index) => {
    setSelectedCandidate(matchCandidates[index]);
    setViewDetails(true);
  }

  (function setHeaderTitle() {
    props.title("Candidates");
    props.subtitle("Centralized page to view and manage all candidates");
  })();

  return (
    <div className="candidates-container">
      <div {...getRootProps()} className={`upload-container ${file ? 'uploaded' : ''}`}>
        <input {...getInputProps()} />
        <img className="upload-icon" src={UploadIcon} alt="Upload" />
        <div className="upload-row">
          <div className="label-container">
            <div className="row1-label">Drag and Drop or choose your file for upload</div>
            <div className="row2-label">Upload multiple resumes for comparison (PDF, DOC, DOCX)</div>
          </div>
          <div className="button-container">
            <button className="browse-button">Browse file</button>
          </div>
        </div>
        {file && <div className="file-name">Selected File: {file.name}</div>}
      </div>
      <div className="candidates card">
        <table className="candidates-table">
          <thead>
            <tr>
              {tableHeader.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate, index) => (
              <tr onClick={() => handleViewDetails(index)} key={index}>
                <td>{candidate.name}</td>
                <td>{candidate.job}</td>
                <td><div className={`status-badge ${candidate.status.toLowerCase().replace(/\s/g, "-")}`}></div>{candidate.status}</td>
                <td>{candidate.experience}</td>
                <td className="cv-link">CV_Frontend_Dev.pdf</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CandidateDetailsModal 
        open={viewDetails} 
        close={() => setViewDetails(false)}
        candidate={selectedCandidate}
        isEditable={true}
      />
    </div>
  );
};

export default CandidatesPage;