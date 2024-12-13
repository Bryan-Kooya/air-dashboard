import React, { useState, useEffect } from "react";
import { UploadIcon } from "../../assets/images";
import "./CandidatesPage.css";
import { useDropzone } from 'react-dropzone';
import { getStorage, ref, uploadBytesResumable } from "firebase/storage";
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import { fetchPaginatedCandidates, searchCandidates } from "../../utils/firebaseService";
import Pagination from "../../components/pagination/Pagination";
// import matchCandidates from "../../utils/matchCandidates.json";

// const candidates = [
//   {name: "John Smith", job: "Frontend Developer", status: "Waiting for approval", experience: "5 years", attachments: "CV_Frontend_Dev.pdf"},
//   {name: "Alice Norman", job: "HR", status: "Selected", experience: "6 years", attachments: "CV_Frontend_Dev.pdf"},
//   {name: "Ryan Rey", job: "UI/UX Designer", status: "Interviewed", experience: "3 years", attachments: "CV_Frontend_Dev.pdf"},
//   {name: "Melissa Moore", job: "Business Manager", status: "Salary draft", experience: "10 years", attachments: "CV_Frontend_Dev.pdf"},
//   {name: "Justine Green", job: "QA Engineer", status: "Selected", experience: "4 years", attachments: "CV_Frontend_Dev.pdf"},
// ];

const CandidatesPage = (props) => {
  const storage = getStorage(); // Initialize Firebase Storage
  const tableHeader = ["Candidate", "Job", "Status", "Experience", "Attachments"];
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({}); // Track upload progress for each file
  const [error, setError] = useState(null);
  const [viewDetails, setViewDetails] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDocs, setLastVisibleDocs] = useState([]); // Track lastVisibleDoc for each page
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 5; // Number of candidates per page
  const [searchQuery, setSearchQuery] = useState(""); // Search query state

  const loadCandidates = async (page) => {
    try {
      const lastVisibleDoc = page > 1 ? lastVisibleDocs[page - 2] : null;
      const { data, lastVisible, total } = await fetchPaginatedCandidates(pageSize, lastVisibleDoc);

      setCandidates(data);

      // Store the lastVisibleDoc for the current page
      setLastVisibleDocs((prev) => {
        const updatedDocs = [...prev];
        updatedDocs[page - 1] = lastVisible; // Update lastVisible for the current page
        return updatedDocs;
      });

      // Set total pages only once
      if (totalPages === 0) {
        setTotalPages(Math.ceil(total / pageSize));
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
    }
  };

  const searchAndLoadCandidates = async () => {
    if (!searchQuery) {
      // If search query is empty, reset to paginated candidates
      setCurrentPage(1);
      setLastVisibleDocs([]);
      await loadCandidates(1);
      return;
    }

    try {
      const data = await searchCandidates(searchQuery);
      setCandidates(data);
      setTotalPages(1); // Since search results are not paginated
    } catch (error) {
      console.error("Error searching candidates:", error);
    }
  };

  useEffect(() => {
    if (!searchQuery) {
      loadCandidates(currentPage);
    }
  }, [currentPage]);

  const onDrop = (acceptedFiles) => {
    setFiles([...files, ...acceptedFiles]); // Allow multiple files to be added
    setUploadStatus({});
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ".pdf, .doc, .docx",
    multiple: true,
  });

  const uploadFiles = async () => {
    if (files.length === 0) {
      alert("No files selected for upload.");
      return;
    }

    const updatedStatus = { ...uploadStatus };

    files.forEach((file) => {
      const storageRef = ref(storage, `resumes/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      // Monitor upload progress
      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          updatedStatus[file.name] = progress;
          setUploadStatus({ ...updatedStatus });
        },
        (error) => {
          console.error("Upload failed for", file.name, error);
          updatedStatus[file.name] = "Failed";
          setUploadStatus({ ...updatedStatus });
        },
        () => {
          // Upload complete
          console.log("Upload complete for", file.name);
          updatedStatus[file.name] = "Complete";
          setUploadStatus({ ...updatedStatus });
        }
      );
    });
  };

  const handleViewDetails = (index) => {
    setSelectedCandidate(candidates[index]);
    setViewDetails(true);
  }

  (function setHeaderTitle() {
    props.title("Candidates");
    props.subtitle("Centralized page to view and manage all candidates");
  })();

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await searchAndLoadCandidates();
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  console.log('Candidates: ', candidates);

  return (
    <div className="candidates-container">
      <div {...getRootProps()} className={`upload-container ${files.length > 0 ? "uploaded" : ""}`}>
      <input {...getInputProps()} />
        <img className="upload-icon" src={UploadIcon} alt="Upload" />
        <div className="upload-row">
          <div className="label-container">
            <div className="row1-label">Drag and Drop or choose your file for upload</div>
            <div className="row2-label">Upload multiple resumes for comparison (PDF, DOC, DOCX)</div>
          </div>
          <div className="button-container">
            <button style={{width: 'max-content'}} className="secondary-button">Browse file</button>
            <button style={{width: 'max-content'}} className="primary-button" onClick={uploadFiles}>Upload Files</button>
          </div>
        </div>
        {files.length > 0 && (
          <div className="file-list">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                {file.name} - {uploadStatus[file.name] || "Pending"}
              </div>
            ))}
          </div>
        )}
      </div>
      <div>
        <form className="search-bar" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </form>
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
            {candidates && candidates.length > 0 ? (
              candidates.map((candidate, index) => (
                <tr onClick={() => handleViewDetails(index)} key={index}>
                  <td>{candidate.contact?.name}</td>
                  <td>{candidate.job}</td>
                  <td>
                    <div className={`status-badge ${candidate.status.toLowerCase().replace(/\s/g, "-")}`}></div>
                    {candidate.status}
                  </td>
                  <td>{candidate.total_experience_years + ' year(s)'}</td>
                  <td className="cv-link">CV_Frontend_Dev.pdf</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="no-data">
                  No candidate available
                </td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
      <CandidateDetailsModal 
        open={viewDetails} 
        close={() => setViewDetails(false)}
        candidate={selectedCandidate}
        isEditable={true}
        loadCandidates={loadCandidates}
      />
    </div>
  );
};

export default CandidatesPage;