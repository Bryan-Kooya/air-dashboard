import React from 'react';
import "./MessageModal.css";
import { Modal, Divider } from '@mui/material';
import { convertDateFormat, formatDate, parseDateDDMMYYYY } from '../../utils/utils';

const MessageModal = (props) => {
  const isOpen = props.open;
  const isClose = props.close;
  const conversation = props.conversation;

  // Check if conversation and messagesByDate exist
  if (!conversation || !conversation.messagesByDate) {
    return (
      <Modal open={isOpen} onClose={isClose}>
        <div className="modal-container">
          <div className="card-title">No conversation data available</div>
        </div>
      </Modal>
    );
  }

  // Sort dates in ascending order
  const sortedDates = Object.keys(conversation.messagesByDate).sort(
    (a, b) => parseDateDDMMYYYY(a) - parseDateDDMMYYYY(b)
  );

  const handleMessageContact = () => {

  };

  return (
    <Modal open={isOpen} onClose={isClose}>
      <div className="modal-container">
        <div className="card-title">{conversation.connection}</div>
        <div className='conversation-container'>
          {sortedDates.map((date) => (
            <div key={date} className="message-container">
              <Divider className="message-date">&nbsp;{convertDateFormat(date)}&nbsp;</Divider>
              {conversation.messagesByDate[date].map((message, index) => (
                <div key={index} className="message-row">
                  <div className={`${conversation.connection !== message.sender ? `user` : ``} name`}>
                    {message.sender} <span className="message-time">• {message.messageTime}</span>
                  </div>
                  {message.messageText && (
                    <div
                      className="message-text"
                      dangerouslySetInnerHTML={{
                        __html: message.messageText.replace(/\n/g, "<br/>"),
                      }}
                    />
                  )}
                  {message.attachments &&
                    message.attachments.map((attachment, attachmentIndex) => (
                      <div key={attachmentIndex} className="message-attachment">
                        <a
                          href={attachment?.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {attachment?.name || "Attachment"}
                        </a>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          ))}
        </div>
        <Divider/>
        <div className='modal-button-container'>
          <button onClick={() => window.open(conversation.senderDetails?.messageUrl, '_blank', 'noopener,noreferrer')} className='send-button'>Send message</button>
          <button onClick={() => window.open(conversation.senderDetails?.profileUrl, '_blank', 'noopener,noreferrer')} className='view-button'>View Profile</button>
        </div>
      </div>
    </Modal>
  );
};

export default MessageModal;