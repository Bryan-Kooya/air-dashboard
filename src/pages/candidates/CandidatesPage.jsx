import React, { useState, useEffect } from "react";
import "./CandidatesPage.css";
import { Select, MenuItem } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { getStorage, ref, uploadBytesResumable } from "firebase/storage";
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import { fetchPaginatedCandidates, searchCandidates } from "../../utils/firebaseService";
import Pagination from "../../components/pagination/Pagination";
import { UploadIcon, SearchIcon } from "../../assets/images";

const CandidatesPage = (props) => {
  const storage = getStorage(); // Initialize Firebase Storage
  const tableHeader = ["Candidate", "Job", "Status", "Experience", "Attachments"];
  const filterOptions = ["Job", "Status", "Experience"];
  const sortOptions = ["Newest", "Oldest"];
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
  const [sortedBy, setSortedBy] = useState("");
  const [filterBy, setFilterBy] = useState(""); // Holds the selected filter value
  const [filteredCandidates, setFilteredCandidates] = useState([]); // Filtered candidates

  // Load all candidates when the page loads
  const loadCandidates = async () => {
    try {
      const { data, total } = await fetchPaginatedCandidates(pageSize, null);
      setCandidates(data);
      setFilteredCandidates(data);
      setTotalPages(Math.ceil(total / pageSize));
    } catch (error) {
      console.error("Error fetching candidates:", error);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  // Filter and sort candidates
  const applyFilterAndSort = (filter, sort) => {
    let updatedCandidates = [...candidates];

    // Filter Logic
    if (filter === "Job") {
      updatedCandidates = updatedCandidates.filter(candidate => candidate.job).sort((a, b) => a.job.localeCompare(b.job));
    } else if (filter === "Status") {
      updatedCandidates = updatedCandidates.filter(candidate => candidate.status).sort((a, b) => a.status.localeCompare(b.status));
    } else if (filter === "Experience") {
      updatedCandidates = updatedCandidates.sort((a, b) => b.total_experience_years - a.total_experience_years);
    }

    // Sort Logic
    if (sort === "Newest") {
      updatedCandidates = updatedCandidates.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sort === "Oldest") {
      updatedCandidates = updatedCandidates.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }

    setFilteredCandidates(updatedCandidates);
  };

  const handleFilterChange = (value) => {
    setFilterBy(value);
    applyFilterAndSort(value, sortedBy);
  };

  const handleSortedBy = (value) => {
    setSortedBy(value);
    applyFilterAndSort(filterBy, value);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await searchCandidates(searchQuery);
      setFilteredCandidates(data);
    } catch (error) {
      console.error("Error searching candidates:", error);
    }
  };

  const handleViewDetails = (index) => {
    setSelectedCandidate(filteredCandidates[index]);
    setViewDetails(true);
  };

  (function setHeaderTitle() {
    props.title("Candidates");
    props.subtitle("Centralized page to view and manage all candidates");
  })();

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
        <div className="candidates card">
          <div className="title-container">
            <div className="card-title">All Candidates</div>
            <div className="flex">
              <Select
                id="select-input"
                displayEmpty
                value={filterBy}
                onChange={(e) => handleFilterChange(e.target.value)}
                renderValue={() => (filterBy ? filterBy : "Filter")}
              >
                {filterOptions.map((option, index) => (
                  <MenuItem id="options" key={index} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              <Select 
                id="select-input" 
                displayEmpty
                value={sortedBy} 
                onChange={(e) => handleSortedBy(e.target.value)}
                renderValue={() => sortedBy ? sortedBy : "Sort by"}
              >
                {sortOptions.map((option, index) => (
                  <MenuItem id="options" key={index} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              <form className="search-container" onSubmit={handleSearchSubmit}>
                <div className="search-wrapper">
                  <img onClick={handleSearchSubmit} src={SearchIcon} alt="Search Icon" className="search-icon" />
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="search primary-button" type="submit">Search</button>
              </form>
            </div>
          </div>
          <table className="candidates-table">
            <thead>
              <tr>
                {tableHeader.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
            {filteredCandidates && filteredCandidates.length > 0 ? (
              filteredCandidates.map((candidate, index) => (
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
                <td className="no-data">No candidate available</td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
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