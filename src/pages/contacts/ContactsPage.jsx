import React, { useState, useEffect, useRef, useCallback } from "react";
import "./ContactsPage.css";
import { Select, MenuItem, Snackbar, Slide, Alert, Tooltip } from '@mui/material';
import { useDropzone } from "react-dropzone";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { searchContacts, fetchPaginatedContacts, deleteContact } from "../../utils/firebaseService";
import { UploadIcon, SearchIcon, Delete, EditIcon, } from "../../assets/images";
import EditContactModal from "../../components/editContactModal/EditContactModal";
import ConfirmModal from "../../components/confirmModal/ConfirmModal";
import CircularLoading from "../../components/circularLoading/CircularLoading";

const ContactsPage = (props) => {
  const tableHeader = ["Name", "Phone Number", "Email", "Resume", "Status", 'Actions'];
  const sortOptions = ["Newest", "Oldest"];
  const userId = props.userId;
  const files = props.files;
  const setFiles = props.setFiles;
  const onFileUpload = props.onFileUpload;
  const contacts = props.contacts;
  const setContacts = props.setContacts;
  const db = getFirestore();
  const [contactsCount, setContactsCount] = useState(0);
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
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [contact, setContact] = useState([]);
  
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
    await onFileUpload(acceptedFiles);
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
      setContactsCount(total);
    } catch (error) {
      console.error("Error fetching contacts:", error);
      updateMessage("An error occurred while loading contacts", "error", true);
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
      updateMessage("An error occurred while loading more contacts", "error", true);
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
      updateMessage("An error occurred while searching contacts", "error", true);
    } finally {
      setLoadingMessages(false);
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
      setContactsCount(contactsCount - 1);
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

  const handleEditContact = (id) => {
    setEditModalOpen(true);
    const selectedContact = contacts.find(contact => contact.id === id);
    setContact(selectedContact);
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setContact((prev) => ({ ...prev, [name]: value }));
  };

  const updateContact = async (updatedContact) => {
    try {
      setLoading(true);
      const contactDoc = doc(db, "contacts", updatedContact.id);
      console.log('Updating contact data:', updatedContact);
      await updateDoc(contactDoc, updatedContact);
      setContacts(contacts.map((contact) => (contact.id === updatedContact.id ? { ...contact, ...updatedContact } : contact)));
      setEditModalOpen(false);
      updateMessage("Contact updated successfully!", "success", true);
    } catch (error) {
      console.error("Error updating contact:", error);
      updateMessage("An error occurred while updating contact!", "error", true);
    } finally {
      setLoading(false);
    }
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
            <div className="row1-label">Drag and drop your resume/cv here or click to upload </div>
            <div className="row2-label">(Supports PDF and DOCX)</div>
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
      </div>
      <div className="candidates card">
        <div className="title-container">
          <div className="card-title">All Contacts ({contactsCount})</div>
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
                  <td className="action-column">
                    <Tooltip onClick={() => handleEditContact(contact.id)} title="Edit">
                      <img src={EditIcon} alt="Edit" />
                    </Tooltip>
                    <Tooltip title="Delete">
                      <img onClick={() => handleShowConfirmation(contact.id)} src={Delete} alt="Delete" />
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
      <EditContactModal 
        open={isEditModalOpen}
        close={() => setEditModalOpen(false)}
        contact={contact}
        loading={loading}
        handleEditInputChange={handleEditInputChange}
        updateContact={updateContact}
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