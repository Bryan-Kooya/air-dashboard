import React, { useState, useEffect, useMemo } from "react";
import "./MessagesPage.css";
import { Select, MenuItem, Snackbar, Slide, Alert } from '@mui/material';
import { truncateText, convertDateFormat } from "../../utils/utils";
import { fetchPaginatedConversations, searchConversations, deleteConversation } from "../../utils/firebaseService";
import { Delete, SearchIcon } from "../../assets/images";
import ConfirmModal from "../../components/confirmModal/ConfirmModal";
import MessageModal from "../../components/messageModal/MessageModal";
import Pagination from "../../components/pagination/Pagination";

const MessagesPage = (props) => {
  const tableHeader = ["Sender", "Message Preview", "Date & Time", "Attachments", 'Actions'];
  const sortOptions = ["Newest", "Oldest"];
  const userId = props.userId;
  const [selectedConvo, setSelectedConvo] = useState([]);
  const [showMessage, setShowMessage] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDocs, setLastVisibleDocs] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [convoId, setConvoId] = useState("");
  const [sortedBy, setSortedBy] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [messageType, setMessageType] = useState("");
  const [confirming, setConfirming] = useState(false);

  const loadConversations = async (page) => {
    try {
      const lastVisibleDoc = page > 1 ? lastVisibleDocs[page - 2] : null;
      const { data, lastVisible, total } = await fetchPaginatedConversations(pageSize, lastVisibleDoc, userId);

      setConversations(data);

      // Store the lastVisibleDoc for the current page
      setLastVisibleDocs((prev) => {
        const updatedDocs = [...prev];
        updatedDocs[page - 1] = lastVisible;
        return updatedDocs;
      });
      setTotalPages(Math.ceil(total / pageSize));
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
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

  const searchAndLoadConversations = async () => {
    if (!searchQuery) {
      setCurrentPage(1);
      setLastVisibleDocs([]);
      await loadConversations(1);
      return;
    }

    try {
      const data = await searchConversations(searchQuery, userId);
      setConversations(data);
      setTotalPages(1);
    } catch (error) {
      console.error("Error searching conversations:", error);
    }
  };

  useEffect(() => {
    if (!searchQuery) {
      loadConversations(currentPage);
    }
  }, [currentPage]);

  const getLatestMessage = (conversation) => {
    const messagesByDate = conversation.messagesByDate;

    if (!messagesByDate || Object.keys(messagesByDate).length === 0) {
      return { date: null, messageText: null, messageTime: null };
    }

    const sortedDates = Object.keys(messagesByDate).sort((a, b) => new Date(b) - new Date(a));

    for (const date of sortedDates) {
      const messages = messagesByDate[date];
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.messageText) {
          return { date, messageText: message.messageText, messageTime: message.messageTime };
        }
      }
    }

    return { date: null, messageText: null, messageTime: null };
  };

  const getResumeFiles = (conversation) => {
    const messagesByDate = conversation.messagesByDate;

    if (!messagesByDate) return [];

    const resumeFiles = [];

    for (const date of Object.keys(messagesByDate)) {
      const messages = messagesByDate[date];
      for (const message of messages) {
        const resumeFilesInMessage = message.attachments.filter((file) => file.isResume === true);
        resumeFiles.push(...resumeFilesInMessage); // Add all resume files to the array
      }
    }

    return resumeFiles; // Return the array of resume files
  };

  // Precompute resume files to avoid recalculating during rendering
  const conversationsWithResumeFiles = useMemo(() => {
    return conversations.map((conversation) => ({
      ...conversation,
      resumeFiles: getResumeFiles(conversation), // Store all resume files
    }));
  }, [conversations]);
  
  const handleShowMessage = (convo) => {
    setSelectedConvo(convo);
    setShowMessage(true);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await searchAndLoadConversations();
  };

  const handleShowConfirmation = (id) => {
    setShowConfirmation(true);
    setConvoId(id);
  };

  const handleSortedBy = (sortOption) => {
    setSortedBy(sortOption);
  
    const sortedConversations = [...conversations].sort((a, b) => {
      const dateA = new Date(getLatestMessage(a).date);
      const dateB = new Date(getLatestMessage(b).date);
  
      if (sortOption === "Newest") {
        return dateB - dateA;
      }
      if (sortOption === "Oldest") {
        return dateA - dateB;
      }
      return 0;
    });
  
    setConversations(sortedConversations);
  };

  const handleDeleteConversation = async () => {
    setConfirming(true);
    try {
      // Delete from Firestore
      await deleteConversation(convoId);

      // Update local state by removing the deleted conversation
      setConversations((prevConversations) =>
        prevConversations.filter((convo) => convo.id !== convoId)
      );
      setTimeout(() => setConfirming(false), 500);
      setShowConfirmation(false);
      updateMessage("Conversation deleted successfully!", "success", true);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      setTimeout(() => setConfirming(false), 500);
      setShowConfirmation(false);
      updateMessage("An error occurred while deleting conversation", "error", true);
    }
  };

  (function setHeaderTitle() {
    props.title("Messages");
    props.subtitle("Manage your conversations effectively with pagination.");
  })();

  return (
    <div className="messages-container">
      <div className="messages card">
        <div className="title-container">
          <div className="card-title">All Messages</div>
          <div className="flex">
            <Select
              id="select-input"
              sx={{ width: 100 }}
              displayEmpty
              value={sortedBy}
              onChange={(e) => handleSortedBy(e.target.value)}
              renderValue={() => (sortedBy ? sortedBy : "Sort by")}
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
                  onChange={handleSearchChange}
                />
              </div>
              <button className="search primary-button" type="submit">Search</button>
            </form>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              {tableHeader.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conversationsWithResumeFiles && conversationsWithResumeFiles.length > 0 ? (
              conversationsWithResumeFiles.map((conversation) => (
                <tr key={conversation.id}>
                  <td onClick={() => handleShowMessage(conversation)}>{conversation.connection}</td>
                  <td>{truncateText(getLatestMessage(conversation).messageText, 80)}</td>
                  <td>
                    {convertDateFormat(getLatestMessage(conversation).date) +
                      ` / ` +
                      getLatestMessage(conversation).messageTime}
                  </td>
                  <td className="cv-link">
                    {conversation.resumeFiles.length > 0 ? (
                      conversation.resumeFiles.map((resumeFile, index) => (
                        <div key={index}>
                          <a href={resumeFile.url} target="_blank" rel="noopener noreferrer">
                            {resumeFile.name || "Attachment"}
                          </a>
                        </div>
                      ))
                    ) : (
                      ""
                    )}
                  </td>
                  <td onClick={() => handleShowConfirmation(conversation.id)} style={{ textAlign: "center" }}>
                    <img src={Delete} alt="Delete" />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={{ marginTop: 10 }} className="no-data">
                  No message available
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
      <MessageModal
        open={showMessage}
        close={() => setShowMessage(false)}
        conversation={selectedConvo}
      />
      <ConfirmModal
        open={showConfirmation}
        close={() => setShowConfirmation(false)}
        delete={handleDeleteConversation}
        item={"message"}
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

export default MessagesPage;