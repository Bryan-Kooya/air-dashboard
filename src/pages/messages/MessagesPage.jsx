import React, { useState, useEffect } from "react";
import "./MessagesPage.css"
import { useNavigate } from "react-router-dom";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";

const MessagesPage = (props) => {
  const tableHeader = ["Sender", "Message Preview", "Date & Time", "Attachments"];
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();

  // Fetch conversations from Firebase Firestore
  const fetchConversations = async () => {
    const conversationsCollection = collection(db, "linkedinConversations");
    const conversationsSnapshot = await getDocs(conversationsCollection);
    const conversationsList = conversationsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setConversations(conversationsList);
    props.updateMessagesCount(conversationsList.length);
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  console.log('Conversations: ', conversations);

  const getLatestMessage = (conversation) => {
    const messagesByDate = conversation.messagesByDate;

    if (!messagesByDate || Object.keys(messagesByDate).length === 0) {
      return { date: null, messageText: null }; // No messages available
    }

    // Extract all dates and sort them in descending order
    const sortedDates = Object.keys(messagesByDate).sort((a, b) => new Date(b) - new Date(a));

    for (const date of sortedDates) {
      const messages = messagesByDate[date];

      // Find the latest message within the date
      for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        if (message.messageText) {
          return { date, messageText: message.messageText }; // Return the date and the latest messageText
        }
    }
    }

    return { date: null, messageText: null }; // No valid messageText found
  }

  const setHeaderTitle = () => {
    props.title("Messages");
    props.subtitle("Add new job postings and manage existing ones, streamlining the recruitment process.");
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  setHeaderTitle();

  return (
    <div className="messages-container">
      <div className="messages card">
        <table className="data-table">
          <thead>
            <tr>
              {tableHeader.map(header => (
                <th>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {conversations.map(conversation => (
              <tr className="convo-row" key={conversation.id}>
                <td>{conversation.connection}</td>
                <td>{getLatestMessage(conversation).messageText}</td>
                <td>{getLatestMessage(conversation).date}</td>
                <td className="cv-link">CV_Frontend_Dev.pdf</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MessagesPage;