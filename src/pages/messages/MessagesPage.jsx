import React, { useState, useEffect } from "react";
import "./MessagesPage.css";
import MessageModal from "../../components/messageModal/MessageModal";
import Pagination from "../../components/pagination/Pagination";
import { truncateText, convertDateFormat } from "../../utils/utils";
import { fetchPaginatedConversations, searchConversations } from "../../utils/firebaseService";

const MessagesPage = (props) => {
  const tableHeader = ["Sender", "Message Preview", "Date & Time", "Attachments"];
  const [selectedConvo, setSelectedConvo] = useState([]);
  const [showMessage, setShowMessage] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDocs, setLastVisibleDocs] = useState([]); // Track lastVisibleDoc for each page
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 10; // Number of conversations per page
  const [searchQuery, setSearchQuery] = useState(""); // Search query state

  const loadConversations = async (page) => {
    try {
      const lastVisibleDoc = page > 1 ? lastVisibleDocs[page - 2] : null;
      const { data, lastVisible, total } = await fetchPaginatedConversations(pageSize, lastVisibleDoc);

      setConversations(data);

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
      console.error("Error fetching conversations:", error);
    }
  };

  const searchAndLoadConversations = async () => {
    if (!searchQuery) {
      // If search query is empty, reset to paginated conversations
      setCurrentPage(1);
      setLastVisibleDocs([]);
      await loadConversations(1);
      return;
    }

    try {
      const data = await searchConversations(searchQuery);
      setConversations(data);
      setTotalPages(1); // Since search results are not paginated
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

  const setHeaderTitle = () => {
    props.title("Messages");
    props.subtitle("Manage your conversations effectively with pagination.");
  };

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

  setHeaderTitle();

  console.log('Conversations: ', conversations)

  return (
    <div className="messages-container">
      <form className="search-bar" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={handleSearchChange}
        />
        {/* <button type="submit">Search</button> */}
      </form>
      <div className="messages card">
        <table className="data-table">
          <thead>
            <tr>
              {tableHeader.map((header, index) => (
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conversations.map((conversation) => (
              <tr onClick={() => handleShowMessage(conversation)} key={conversation.id}>
                <td>{conversation.connection}</td>
                <td>{truncateText(getLatestMessage(conversation).messageText, 120)}</td>
                <td>
                  {convertDateFormat(getLatestMessage(conversation).date) +
                    ` / ` +
                    getLatestMessage(conversation).messageTime}
                </td>
                <td className="cv-link">CV_Frontend_Dev.pdf</td>
              </tr>
            ))}
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
    </div>
  );
};

export default MessagesPage;