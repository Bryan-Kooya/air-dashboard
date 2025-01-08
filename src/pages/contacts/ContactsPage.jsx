import React, { useState, useEffect } from "react";
import "./ContactsPage.css";
import { Select, MenuItem, CircularProgress } from '@mui/material';
import { useDropzone } from "react-dropzone";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { searchContacts, fetchPaginatedContacts } from "../../utils/firebaseService";
import { extractTextFromPDF, extractTextFromDocx } from "../../utils/helper";
import { capitalizeFirstLetter } from "../../utils/utils";
import { UploadIcon, SearchIcon } from "../../assets/images";
import { apiBaseUrl } from "../../utils/constants";
import Pagination from "../../components/pagination/Pagination";

const ContactsPage = (props) => {
  const tableHeader = ["Name", "Phone Number", "Email", "Resume", "Status"];
  const sortOptions = ["Newest", "Oldest"];
  const storage = getStorage(); // Initialize Firebase Storage
  const db = getFirestore(); // Initialize Firestore
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({}); // Track upload progress for each file
  const [contacts, setContacts] = useState([]);
  const [sortedBy, setSortedBy] = useState("");
  const [searchQuery, setSearchQuery] = useState(""); // Search query state
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDocs, setLastVisibleDocs] = useState([]); // Track lastVisibleDoc for each page
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const pageSize = 5;
  const userId = props.userId;

  const onDrop = (acceptedFiles) => {
    setFiles([...files, ...acceptedFiles]); // Allow multiple files to be added
    setUploadStatus({});
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ".pdf, .doc, .docx",
    multiple: true,
  });

  const loadContacts = async (page) => {
    try {
      const lastVisibleDoc = page > 1 ? lastVisibleDocs[page - 2] : null;
      const { data, lastVisible, total } = await fetchPaginatedContacts(pageSize, lastVisibleDoc, userId);

      setContacts(data);

      // Store the lastVisibleDoc for the current page
      setLastVisibleDocs((prev) => {
        const updatedDocs = [...prev];
        updatedDocs[page - 1] = lastVisible; // Update lastVisible for the current page
        return updatedDocs;
      });
      setTotalPages(Math.ceil(total / pageSize));
    } catch (error) {
      console.error("Error fetching contacts:", error);
    }
  };

  const searchAndLoadContacts = async () => {
    if (!searchQuery) {
      // If search query is empty, reset to paginated contacts
      setCurrentPage(1);
      setLastVisibleDocs([]);
      await loadContacts(1);
      return;
    }

    try {
      const data = await searchContacts(searchQuery, userId);
      setContacts(data);
      setTotalPages(1); // Since search results are not paginated
    } catch (error) {
      console.error("Error searching contacts:", error);
    }
  };

  const uploadFiles = async () => {
    setLoading(true);
    if (files.length === 0) {
      alert("No files selected for upload.");
      setLoading(false);
      return;
    }
  
    const updatedStatus = { ...uploadStatus };
  
    // Create an array of promises for all file uploads and processing
    const uploadPromises = files.map(async (file) => {
      const storageRef = ref(storage, `resumes/${file.name}`);
      const metadata = { customMetadata: { userId } };
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
  
      return new Promise((resolve, reject) => {
        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            updatedStatus[file.name] = progress;
            setUploadStatus({ ...updatedStatus });
          },
          (error) => {
            console.error("Upload failed for", file.name, error);
            updatedStatus[file.name] = "Failed";
            setUploadStatus({ ...updatedStatus });
            reject(error); // Reject the promise if upload fails
          },
          async () => {
            // Upload complete
            console.log("Upload complete for", file.name);
  
            try {
              // Get the download URL
              const downloadUrl = await getDownloadURL(storageRef);
  
              // Extract text from the file
              const fileType = file.name.split(".").pop().toLowerCase();
              let resumeText = "";
  
              if (fileType === "pdf") {
                resumeText = await extractTextFromPDF(downloadUrl);
              } else if (fileType === "docx") {
                resumeText = await extractTextFromDocx(downloadUrl);
              } else {
                throw new Error("Unsupported file type");
              }
  
              // Send extracted text to the API
              const response = await fetch(`${apiBaseUrl}/process-resume`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ resumeText }),
              });
  
              if (!response.ok) {
                throw new Error("Failed to process resume");
              }
  
              const apiData = await response.json();
  
              // Save the response in Firestore
              const formattedName = file.name
                .replace(/\.[^/.]+$/, "")
                .replace(/[_-]+/g, " ")
                .replace(/\b(resume|cv|curriculum vitae)\b/gi, "")
                .trim();
  
              const newContact = {
                name: apiData.contact.name || capitalizeFirstLetter(formattedName),
                email: apiData.contact.email || "",
                phone: apiData.contact.phone || "",
                location: apiData.contact.location || "N/A",
                linkedin: apiData.contact.linkedin || "",
                tags: apiData.tags || [],
                fileName: file.name,
                url: downloadUrl,
                jobs: [],
                resumeText: resumeText,
                status: "Active",
                userId: userId,
                timestamp: serverTimestamp(),
              };
  
              await addDoc(collection(db, "contacts"), newContact);
              updatedStatus[file.name] = "Complete";
              setUploadStatus({ ...updatedStatus });
              console.log("Contact added to Firestore:", newContact);
              // Update the local contacts state
              setContacts((prevContacts) => [newContact, ...prevContacts]);
              resolve(); // Resolve the promise if everything is successful
            } catch (error) {
              console.error("Error processing and saving contact:", error);
              reject(error); // Reject the promise if processing fails
            }
          }
        );
      });
    });
  
    // Wait for all upload promises to resolve
    await Promise.all(uploadPromises);
  };
  
  const handleUploadFiles = async () => {
    try {
      await uploadFiles();
      setLoading(false);
      files.length !== 0 && alert("All files uploaded and processed successfully!");
    } catch (error) {
      console.error("Error uploading files:", error);
      setLoading(false);
      alert("Some files failed to upload or process.");
    }
  };
  
  const handleSortedBy = (sortOption) => {
    setSortedBy(sortOption);
  
    const sortedContacts = [...contacts].sort((a, b) => {
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
  
    setContacts(sortedContacts);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await searchAndLoadContacts();
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  useEffect(() => {
    if (!searchQuery) {
      loadContacts(currentPage);
    }
  }, [currentPage]);

  (function setHeaderTitle() {
    props.title("Contacts");
    props.subtitle("Centralized page to view and manage all contacts");
  })();

  return (
    <div className="contacts-container">
      <div {...getRootProps()} className={`upload-container ${files.length > 0 ? "uploaded" : ""}`}>
        <input {...getInputProps()} />
        <img className="upload-icon" src={UploadIcon} alt="Upload" />
        <div className="upload-row">
          <div className="label-container">
            <div className="row1-label">Drag and Drop or choose your file for upload</div>
            <div className="row2-label">Upload multiple resumes for comparison (PDF, DOC, DOCX)</div>
          </div>
          {loading ? 
          <div className="progress-container">
            {/* Background Circle (Track) */}
            <CircularProgress
              variant="determinate"
              size={30}
              thickness={6}
              value={100}
              sx={{
                color: "#6E6E6E2B", // Gray color for the background track
              }}
            />
            {/* Foreground Progress */}
            <CircularProgress
              size={30}
              thickness={6}
              sx={{
                color: "#02B64A", // Green color for the actual progress
                position: "absolute", // Place on top of the track
              }}
            />
          </div> :
          <div className="button-container">
            <button
              style={{ width: "max-content" }}
              className="secondary-button"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering unnecessary events
                document.querySelector(".file-input").click(); // Trigger the file input
              }}
            >
              Browse Files
            </button>
            <button
              style={{ width: "max-content" }}
              className="primary-button"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering unnecessary events
                handleUploadFiles();
              }}
            >
              Upload Files
            </button>
          </div>}
          <input
            {...getInputProps()}
            className="file-input" // Add a unique class name to the input for targeting
            style={{ display: "none" }} // Hide the input element
          />
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
          <div className="card-title">All Contacts</div>
          <div className="flex">
            <Select 
              id="select-input" 
              sx={{width: 100}}
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
            {contacts && contacts.length > 0 ?
            (contacts.map((contact) => (
              <tr key={contact.id}>
                <td>{contact.name}</td>
                <td>{contact.phone}</td>
                <td>{contact.email?.toLowerCase()}</td>
                <td className="cv-link">
                  <a
                    href={contact.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {contact.fileName || "Attachment"}
                  </a>
                </td>
                <td>
                  <div className={`status-badge ${contact.status?.toLowerCase().replace(/\s/g, "-")}`}></div>
                  {contact.status}
                </td>
              </tr>
            ))) : (
              <tr>
                <td className="no-data">
                  No contacts available
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
  );
};

export default ContactsPage;