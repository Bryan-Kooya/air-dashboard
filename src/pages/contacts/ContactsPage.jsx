import React, { useState, useEffect, useRef, useCallback } from "react";
import "./ContactsPage.css";
import { Select, MenuItem, Snackbar, Slide, Alert, Tooltip } from '@mui/material';
import { useDropzone } from "react-dropzone";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { searchContacts, fetchPaginatedContacts, deleteContact } from "../../utils/firebaseService";
import { extractTextFromPDF, extractTextFromDocx } from "../../utils/helper";
import { capitalizeFirstLetter } from "../../utils/utils";
import { UploadIcon, SearchIcon, Delete } from "../../assets/images";
import { apiBaseUrl } from "../../utils/constants";
import ConfirmModal from "../../components/confirmModal/ConfirmModal";
import CircularLoading from "../../components/circularLoading/CircularLoading";

const ContactsPage = (props) => {
  const tableHeader = ["Name", "Phone Number", "Email", "Resume", "Status", 'Actions'];
  const sortOptions = ["Newest", "Oldest"];
  const userId = props.userId;
  const userInfo = props.userInfo;
  const storage = getStorage();
  const db = getFirestore();
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({});
  const [contacts, setContacts] = useState([]);
  const [sortedBy, setSortedBy] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [messageType, setMessageType] = useState("");
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [contactId, setContactId] = useState("");
  const observer = useRef();
  const pageSize = 5;

  const lastContactElementRef = useCallback(node => {
    if (loadingMessages) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreContacts();
      }
    }, { threshold: 0.5 });

    if (node) observer.current.observe(node);
  }, [loadingMessages, hasMore]);

  const onDrop = async (acceptedFiles) => {
    setFiles([...files, ...acceptedFiles]);
    setUploadStatus({});
    await uploadFiles(acceptedFiles);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: ".pdf, .docx",
    multiple: true,
  });

  const loadContacts = async () => {
    try {
      const { data, lastVisible: last, total } = await fetchPaginatedContacts(pageSize, null, userId);
      setContacts(data);
      setLastVisible(last);
      setHasMore(data.length < total);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      updateMessage("Error loading contacts", "error", true);
    }
  };

  const loadMoreContacts = async () => {
    if (!hasMore || loadingMessages) return;
    
    setLoadingMessages(true);
    try {
      const { data, lastVisible: last, total } = await fetchPaginatedContacts(
        pageSize,
        lastVisible,
        userId
      );
      
      if (data.length > 0) {
        setContacts([...contacts, ...data]);
        setLastVisible(last);
        setHasMore(contacts.length + data.length < total);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more contacts:", error);
      updateMessage("Error loading more contacts", "error", true);
    } finally {
      setLoadingMessages(false);
    }
  };

  const searchAndLoadContacts = async () => {
    if (!searchQuery) {
      setContacts([]);
      setLastVisible(null);
      setHasMore(true);
      await loadContacts();
      return;
    }
    try {
      setLoadingMessages(true);
      const data = await searchContacts(searchQuery, userId);
      setContacts(data);
      setHasMore(false);
    } catch (error) {
      console.error("Error searching contacts:", error);
      updateMessage("Error searching contacts", "error", true);
    } finally {
      setLoadingMessages(false);
    }
  };

  const uploadFiles = async (filesToUpload) => {
    setLoading(true);
    if (filesToUpload.length === 0) {
      updateMessage("No files selected for upload.", "warning", true);
      setLoading(false);
      return;
    }
  
    const updatedStatus = { ...uploadStatus };
  
    try {
      // Filter out unsupported files
      const validFiles = filesToUpload.filter((file) => {
        const fileType = file.name.split(".").pop().toLowerCase();
        if (!["pdf", "docx"].includes(fileType)) {
          updateMessage(`Skipping ${file.name} file. Only PDF and DOCX files are allowed.`, "warning", true);
          updatedStatus[file.name] = "Failed";
          setUploadStatus({ ...updatedStatus });
          return false; // Exclude this file
        }
        return true; // Include this file
      });
  
      if (validFiles.length === 0) {
        updateMessage("No valid files to upload. Only PDF and DOCX files are allowed.", "warning", true);
        setLoading(false);
        return;
      }
  
      const uploadPromises = validFiles.map(async (file) => {
        const fileType = file.name.split(".").pop().toLowerCase();
        const storageRef = ref(storage, `resumes/${userInfo.name}/${file.name}`);
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
              reject(error);
            },
            async () => {
              try {
                const downloadUrl = await getDownloadURL(storageRef);
                let resumeText = "";
  
                if (fileType === "pdf") {
                  resumeText = await extractTextFromPDF(downloadUrl);
                } else if (fileType === "docx") {
                  resumeText = await extractTextFromDocx(downloadUrl);
                }
  
                const response = await fetch(`${apiBaseUrl}/process-resume`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ resumeText }),
                });
  
                if (!response.ok) {
                  throw new Error("Failed to process resume");
                }
  
                const apiData = await response.json();
                const contactsRef = collection(db, "contacts");
                const querySnapshot = await getDocs(
                  query(
                    contactsRef,
                    where("name", "==", capitalizeFirstLetter(apiData.contact.name)),
                    where("userId", "==", userId)
                  )
                );
  
                if (!querySnapshot.empty) {
                  const existingContactDoc = querySnapshot.docs[0];
                  const existingContactRef = doc(db, "contacts", existingContactDoc.id);
                  await updateDoc(existingContactRef, {
                    email: apiData.contact.email || existingContactDoc.data().email,
                    phone: apiData.contact.phone || existingContactDoc.data().phone,
                    location: apiData.contact.location || existingContactDoc.data().location,
                    linkedin: apiData.contact.linkedin || existingContactDoc.data().linkedin,
                    tags: apiData.tags || existingContactDoc.data().tags,
                    fileName: file.name,
                    language: apiData.language || "en",
                    introduction: apiData.introduction || [],
                    url: downloadUrl,
                    resumeText: resumeText,
                    status: "Active",
                    timestamp: serverTimestamp(),
                  });
                  console.log("Contact updated in Firestore:", existingContactDoc.id);
                  // Update the local contacts state
                  setContacts((prevContacts) =>
                    prevContacts.map((contact) =>
                      contact.name === existingContactDoc.data().name
                        ? { ...contact, ...apiData, fileName: file.name, url: downloadUrl, resumeText }
                        : contact
                    )
                  );  
                } else {
                  const formattedName = file.name
                    .replace(/\.[^/.]+$/, "")
                    .replace(/[_-]+/g, " ")
                    .replace(/\b(resume|cv|curriculum vitae)\b/gi, "")
                    .trim();
  
                  const newContact = {
                    name: capitalizeFirstLetter(apiData.contact.name) || capitalizeFirstLetter(formattedName),
                    email: apiData.contact.email || "",
                    phone: apiData.contact.phone || "",
                    location: apiData.contact.location || "N/A",
                    linkedin: apiData.contact.linkedin || "",
                    tags: apiData.tags || [],
                    fileName: file.name,
                    language: apiData.language || "en",
                    introduction: apiData.introduction || [],
                    url: downloadUrl,
                    jobs: [],
                    resumeText: resumeText,
                    status: "Active",
                    userId: userId,
                    timestamp: serverTimestamp(),
                  };
  
                  await addDoc(collection(db, "contacts"), newContact);
                  // Update the local contacts state
                  setContacts((prevContacts) => [newContact, ...prevContacts]);
                  console.log("Contact added to Firestore:", newContact);
                }
  
                updatedStatus[file.name] = "Complete";
                setUploadStatus({ ...updatedStatus });
                resolve();
              } catch (error) {
                console.error("Error processing and saving contact:", error);
                updatedStatus[file.name] = "Failed";
                setUploadStatus({ ...updatedStatus });
                reject(error);
              }
            }
          );
        });
      });
  
      await Promise.all(uploadPromises);
      updateMessage("All valid files uploaded and processed successfully!", "success", true);
    } catch (error) {
      console.error("Error in uploadFiles:", error);
      updateMessage(`Error: ${error.message}`, "error", true);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async () => {
    setConfirming(true);
    try {
      // Delete from Firestore
      await deleteContact(contactId);

      // Update local state by removing the deleted contact
      setContacts((prevContacts) =>
        prevContacts.filter((contact) => contact.id !== contactId)
      );
      setTimeout(() => setConfirming(false), 500);
      setShowConfirmation(false);
      updateMessage("Contact deleted successfully!", "success", true);
    } catch (error) {
      console.error("Error deleting contact:", error);
      setTimeout(() => setConfirming(false), 500);
      setShowConfirmation(false);
      updateMessage("An error occurred while deleting contact", "error", true);
    }
  };

  const handleShowConfirmation = (id) => {
    setShowConfirmation(true);
    setContactId(id);
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

  const updateMessage = (value, type, isOpen) => {
    setMessage(value);
    setMessageType(type);
    if (isOpen && !open) {
      setOpen(true); // Only set open to true if it's not already open
    }
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  // Watch for changes in searchQuery
  useEffect(() => {
    if (searchQuery === "" || searchQuery.length >= 3) {
      handleSearchSubmit({ preventDefault: () => {} }); // Simulate form submission
    }
  }, [searchQuery]);

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
            <div className="row2-label">Upload multiple resumes for comparison (PDF, DOCX)</div>
          </div>
          {loading ? 
          <CircularLoading color={"#02B64A"}/> :
          <div className="button-container">
            <button
              style={{ width: "max-content" }}
              className="primary-button"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering unnecessary events
                document.querySelector(".file-input").click(); // Trigger the file input
              }}
            >
              Upload CVs
            </button>
          </div>}
          <input
            {...getInputProps()}
            className="file-input" // Add a unique class name to the input for targeting
            style={{ display: "none" }} // Hide the input element
          />
        </div>
        {/* {files.length > 0 && (
          <div className="file-list">
            {files.map((file, index) => (
              <div key={index} className="file-item">
                {file.name} - {uploadStatus[file.name] || "Pending"}
              </div>
            ))}
          </div>
        )} */}
      </div>
      <div className="candidates card">
        <div className="title-container">
          <div className="card-title">All Contacts</div>
          <div className="flex">
            <Select
              id="select-input"
              sx={{ width: 100 }}
              displayEmpty
              value={sortedBy}
              onChange={(e) => handleSortedBy(e.target.value)}
              renderValue={() => sortedBy ? sortedBy : "Sort by"}
            >
              {sortOptions.map((option, index) => (
                <MenuItem key={index} value={option}>
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
            {contacts && contacts.length > 0 ? (
              contacts.map((contact, index) => (
                <tr
                  key={contact.id}
                  ref={index === contacts.length - 1 ? lastContactElementRef : null}
                >
                  <td>{contact.name}</td>
                  <td>{contact.phone}</td>
                  <td className="cv-link">
                    <a href={`mailto:${contact.email}?subject=Your Subject Here&body=Your message here`}>
                      {contact.email?.toLowerCase()}
                    </a>
                  </td>
                  <td className="cv-link">
                    <a href={contact.url} target="_blank" rel="noopener noreferrer">
                      {contact.fileName || "Attachment"}
                    </a>
                  </td>
                  <td>
                    <div className={`status-badge ${contact.status?.toLowerCase().replace(/\s/g, "-")}`}></div>
                    {contact.status}
                  </td>
                  <td onClick={() => handleShowConfirmation(contact.id)} style={{ textAlign: "center" }}>
                    <Tooltip title="Delete">
                      <img src={Delete} alt="Delete" />
                    </Tooltip>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={{maxWidth: "100%"}} colSpan={tableHeader.length} className="no-data">
                  No contacts available
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loadingMessages && <CircularLoading/>}
      </div>
      <ConfirmModal
        open={showConfirmation}
        close={() => setShowConfirmation(false)}
        delete={handleDeleteContact}
        item={"contact"}
        loading={confirming}
      />
      <Snackbar
        autoHideDuration={5000}
        open={open}
        onClose={handleClose}
        TransitionComponent={Slide} // Use Slide transition
        TransitionProps={{ direction: "up" }} // Specify the slide direction
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }} // Position the Snackbar
      >
        <Alert sx={{ alignItems: 'center', "& .MuiAlert-action": { padding: '0px 0px 0px 6px' }, "& .MuiButtonBase-root": { width: '36px' } }} onClose={handleClose} severity={messageType}>
          {message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default ContactsPage;