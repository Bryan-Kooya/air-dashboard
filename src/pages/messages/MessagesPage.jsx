import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import "./MessagesPage.css";
import { Select, MenuItem, Snackbar, Slide, Alert, Tooltip } from '@mui/material';
import { truncateText, convertDateFormat } from "../../utils/utils";
import { db } from "../../firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";
import { fetchPaginatedConversations, searchConversations, deleteConversation } from "../../utils/firebaseService";
import { Delete, SearchIcon } from "../../assets/images";
import ConfirmModal from "../../components/confirmModal/ConfirmModal";
import MessageModal from "../../components/messageModal/MessageModal";
import CircularLoading from "../../components/circularLoading/CircularLoading";

const MessagesPage = (props) => {
  const tableHeader = ["Sender", "Message Preview", "Date & Time", "Attachments", 'Actions'];
  const sortOptions = ["Newest", "Oldest"];
  const userId = props.userId;
  const [selectedConvo, setSelectedConvo] = useState([]);
  const [showMessage, setShowMessage] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationsCount, setConversationsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [searchQuery, setSearchQuery] = useState("");
  const [convoId, setConvoId] = useState("");
  const [sortedBy, setSortedBy] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [messageType, setMessageType] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const observer = useRef();

  const lastConversationElementRef = useCallback(node => {
    if (loadingMessages) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreConversations();
      }
    }, { threshold: 0.5 });

    if (node) observer.current.observe(node);
  }, [loadingMessages, hasMore]);

  const loadConversations = async () => {
    try {
      const { data, lastVisible: last, total } = await fetchPaginatedConversations(pageSize, null, userId);
      setConversations(data);
      setLastVisible(last);
      setHasMore(data.length < total);
      setConversationsCount(total);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      updateMessage("Error loading conversations", "error", true);
    }
  };

  const loadMoreConversations = async () => {
      if (!hasMore || loadingMessages) return;
      
      setLoadingMessages(true);
      try {
        const { data, lastVisible: last, total } = await fetchPaginatedConversations(
          pageSize,
          lastVisible,
          userId
        );
        
        if (data.length > 0) {
          setConversations([...conversations, ...data]);
          setLastVisible(last);
          setHasMore(conversations.length + data.length < total);
        } else {
          setHasMore(false);
        }
      } catch (error) {
        console.error("Error loading more conversations:", error);
        updateMessage("Error loading more conversations", "error", true);
      } finally {
        setLoadingMessages(false);
      }
    };

  const searchAndLoadConversations = async () => {
    if (!searchQuery) {
      setConversations([])
      setLastVisible(null);
      setHasMore(true);
      await loadConversations();
      return;
    }
    try {
      setLoadingMessages(true);
      const data = await searchConversations(searchQuery, userId);
      setConversations(data);
      setHasMore(false);
    } catch (error) {
      console.error("Error searching conversations:", error);
      updateMessage("Error searching conversations", "error", true);
    } finally {
      setLoadingMessages(false);
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
    const uniqueFileUrls = new Set(); // Track unique file URLs
  
    for (const date of Object.keys(messagesByDate)) {
      const messages = messagesByDate[date];
      for (const message of messages) {
        const resumeFilesInMessage = message.attachments.filter((file) => file.isResume === true);
        for (const resumeFile of resumeFilesInMessage) {
          if (!uniqueFileUrls.has(resumeFile.url)) {
            uniqueFileUrls.add(resumeFile.url); // Add to the Set to track uniqueness
            resumeFiles.push(resumeFile); // Add to the array if it's unique
          }
        }
      }
    }
  
    return resumeFiles; // Return the array of unique resume files
  };

  // Precompute resume files to avoid recalculating during rendering
  const conversationsWithResumeFiles = useMemo(() => {
    return conversations.map((conversation) => ({
      ...conversation,
      resumeFiles: getResumeFiles(conversation), // Store unique resume files
    }));
  }, [conversations]);
  
  const handleShowMessage = (convo) => {
    setSelectedConvo(convo);
    setShowMessage(true);
    markConversationAsRead(`${userId}_${convo.connection}`);
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
      setConversationsCount(conversationsCount - 1);
      updateMessage("Conversation deleted successfully!", "success", true);
    } catch (error) {
      console.error("Error deleting conversation:", error);
      setTimeout(() => setConfirming(false), 500);
      setShowConfirmation(false);
      updateMessage("An error occurred while deleting conversation", "error", true);
    }
  };

  const markConversationAsRead = async (conversationId) => {
    try {
      const conversationRef = doc(db, "linkedinConversations", conversationId);
      await updateDoc(conversationRef, { read: true });
      setConversations((prevConversations) =>
        prevConversations.map((conv) =>
          conv.id === conversationId ? { ...conv, read: true } : conv
        )
      );
      console.log("Conversation marked as read:", conversationId);
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  };

  // Watch for changes in searchQuery
  useEffect(() => {
    if (searchQuery === "" || searchQuery.length >= 3) {
      handleSearchSubmit({ preventDefault: () => {} }); // Simulate form submission
    }
  }, [searchQuery]);

  (function setHeaderTitle() {
    props.title("Messages");
    props.subtitle("Manage your conversations effectively with pagination.");
  })();

  return (
    <div className="messages-container">
      <div className="messages card">
        <div className="title-container">
          <div className="card-title">All Messages ({conversationsCount})</div>
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
              conversationsWithResumeFiles.map((conversation, index) => (
                <tr 
                  className={`${conversation.read ? '' : 'unread'}`} key={conversation.id}
                  ref={index === conversations.length - 1 ? lastConversationElementRef : null}
                >
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
                    <Tooltip title="Delete">
                      <img src={Delete} alt="Delete" />
                    </Tooltip>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={{ marginTop: 10 }} className="no-data" colSpan={tableHeader.length}>
                  No message available
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loadingMessages && <CircularLoading/>}
      </div>
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