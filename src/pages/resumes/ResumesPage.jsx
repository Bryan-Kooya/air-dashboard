import React, { useState, useEffect } from "react";
import "./ResumesPage.css";
import { Select, MenuItem } from '@mui/material';
import { useDropzone } from "react-dropzone";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { searchResumes, fetchPaginatedResumes } from "../../utils/firebaseService";
import { capitalizeFirstLetter } from "../../utils/utils";
import { UploadIcon, SearchIcon } from "../../assets/images";

const ResumesPage = (props) => {
  const tableHeader = ["Name", "Phone Number", "Email", "Resume", "Status"];
  const sortOptions = ["Newest", "Oldest"];
  const storage = getStorage(); // Initialize Firebase Storage
  const db = getFirestore(); // Initialize Firestore
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({}); // Track upload progress for each file
  const [resumes, setResumes] = useState([]);
  const [sortedBy, setSortedBy] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // Search query state
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDocs, setLastVisibleDocs] = useState([]); // Track lastVisibleDoc for each page
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10; // Number of resumes per page

  const onDrop = (acceptedFiles) => {
    setFiles([...files, ...acceptedFiles]); // Allow multiple files to be added
    setUploadStatus({});
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ".pdf, .doc, .docx",
    multiple: true,
  });

  const loadResumes = async (page) => {
    try {
      const lastVisibleDoc = page > 1 ? lastVisibleDocs[page - 2] : null;
      const { data, lastVisible, total } = await fetchPaginatedResumes(pageSize, lastVisibleDoc);

      setResumes(data);

      // Store the lastVisibleDoc for the current page
      setLastVisibleDocs((prev) => {
        const updatedDocs = [...prev];
        updatedDocs[page - 1] = lastVisible; // Update lastVisible for the current page
        return updatedDocs;
      });
      setTotalPages(Math.ceil(total / pageSize));
    } catch (error) {
      console.error("Error fetching resumes:", error);
    }
  };

  const searchAndLoadResumes = async () => {
    if (!searchQuery) {
      // If search query is empty, reset to paginated resumes
      setCurrentPage(1);
      setLastVisibleDocs([]);
      await loadResumes(1);
      return;
    }

    try {
      const data = await searchResumes(searchQuery);
      setResumes(data);
      setTotalPages(1); // Since search results are not paginated
    } catch (error) {
      console.error("Error searching resumes:", error);
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) {
      alert("No files selected for upload.");
      return;
    }

    const updatedStatus = { ...uploadStatus };

    await Promise.all(
      files.map(async (file) => {
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
          async () => {
            // Upload complete
            console.log("Upload complete for", file.name);
            updatedStatus[file.name] = "Complete";
            setUploadStatus({ ...updatedStatus });

            // Get the download URL and create Firestore entry
            try {
              const downloadUrl = await getDownloadURL(storageRef);
              const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
              const formattedName = nameWithoutExtension
                .replace(/[_-]+/g, " ") // Replace underscores and hyphens with spaces
                .replace(/\b(resume|cv|curriculum vitae)\b/gi, "") // Remove "resume", "CV", or "Curriculum Vitae" case-insensitively
                .trim(); // Remove any extra spaces

              const newApplicant = {
                name: capitalizeFirstLetter(formattedName),
                fileName: file.name,
                url: downloadUrl,
                jobs: [], // Initialize empty jobs array
                status: "Active",
                owner: "",
                timestamp: serverTimestamp(), // Add timestamp
              };

              const docRef = await addDoc(collection(db, "applicants"), newApplicant);
              console.log("Applicant added with ID:", docRef.id);
            } catch (error) {
              console.error("Failed to add applicant to Firestore:", error);
            }
          }
        );
      })
    );

    alert("All files uploaded successfully!");
  };

  const handleSortedBy = (sortOption) => {
    setSortedBy(sortOption);
  
    const sortedResumes = [...resumes].sort((a, b) => {
      const dateA = a.timestamp;
      const dateB = b.timestamp;
  
      if (sortOption === "Newest") {
        return dateB - dateA; // Sort by descending date
      }
      if (sortOption === "Oldest") {
        return dateA - dateB; // Sort by ascending date
      }
      return 0;
    });
  
    setResumes(sortedResumes);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await searchAndLoadResumes();
  };

  useEffect(() => {
    if (!searchQuery) {
      loadResumes(currentPage);
    }
  }, [currentPage]);

  (function setHeaderTitle() {
    props.title("Contacts");
    props.subtitle("Centralized page to view and manage all resumes");
  })();

  return (
    <div className="resumes-container">
      <div {...getRootProps()} className={`upload-container ${files.length > 0 ? "uploaded" : ""}`}>
        <input {...getInputProps()} />
        <img className="upload-icon" src={UploadIcon} alt="Upload" />
        <div className="upload-row">
          <div className="label-container">
            <div className="row1-label">Drag and Drop or choose your file for upload</div>
            <div className="row2-label">Upload multiple resumes for comparison (PDF, DOC, DOCX)</div>
          </div>
          <div className="button-container">
            <button style={{ width: "max-content" }} className="secondary-button">Browse file</button>
            <button style={{ width: "max-content" }} className="primary-button" onClick={uploadFiles}>
              Upload Files
            </button>
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
      <div className="candidates card">
        <div className="title-container">
          <div className="card-title">All Resumes</div>
          <div className="flex">
            <Select 
              id="select-input" 
              displayEmpty
              value={sortedBy} 
              onChange={(e) => handleSortedBy(e.target.value)}
              renderValue={() => sortedBy ? sortedBy : "Sort by"}
            >
              {sortOptions.map((option, index) => (
                <MenuItem id="options" key={index} value={option} onChange={() => handleSortedBy(option)}>
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
            {resumes && resumes.length > 0 ?
            (resumes.map((resume) => (
              <tr key={resume.id}>
                <td>{resume.name}</td>
                <td>+18143512526</td>
                <td>some.email@gmail.com</td>
                <td className="cv-link">
                  <a
                    href={resume.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {resume.fileName || "Attachment"}
                  </a>
                </td>
                <td>
                  <div className={`status-badge ${resume.status?.toLowerCase().replace(/\s/g, "-")}`}></div>
                  {resume.status}
                </td>
              </tr>
            ))) : (
              <tr>
                <td className="no-data">
                  No contact available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ResumesPage;