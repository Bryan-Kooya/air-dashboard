import React, { useState } from "react";
import "./InterviewPrepModal.css";
import { Modal, Chip } from "@mui/material";
import { Close, CopyIcon, CheckIcon, InterviewIcon, BulbIcon, BookIcon } from "../../assets/images";

const tabs = [
  { name: 'Questions', icon: InterviewIcon },
  { name: 'Preparation Tips', icon: BulbIcon },
  { name: 'Key Topics', icon: BookIcon },
]

const InterviewPrepModal = (props) => {
  const open = props.open;
  const close = props.close;
  const prepData = props.prepData;
  const [activeTab, setActiveTab] = useState(0);

  const groupedQuestions = prepData?.questions.reduce((acc, question) => {
    acc[question.category] = acc[question.category] || [];
    acc[question.category].push(question);
    return acc;
  }, {});

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleClose = () => {
    close();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="interview-modal-container">
        <div className="modal-header">
          <div className="modal-title">
            <div>Interview Preparation Toolkit</div>
            <div className="modal-subtitle">AI-generated interview questions and preparation materials tailored to the position</div>
          </div>
          <img onClick={handleClose} src={Close} alt='Close'/>
        </div>
        <div className="modal-card">
          <div className="tab-container-section">
            {tabs.map((tab, index) => (
              <button
                key={index}
                className={`tab-button ${activeTab === index ? "selected" : ""}`}
                onClick={() => setActiveTab(index)}
              >
                <img src={tab.icon} alt={tab.name} />
                {tab.name}
              </button>
            ))}
          </div>
          {prepData && activeTab == 0 && Object.entries(groupedQuestions).map(([category, questions]) => (
            <div className="card-section" key={category}>
              <div className="section-title">{category} Questions</div>
              {questions.map((data, index) => (
                <div className="card-item" key={index}>
                  <div className="card-item-title">
                    <div className="section-label">{data.question}</div>
                    <Chip id="tags" label={data.difficulty} />
                  </div>
                  <div className="card-light-label">{data.answer}</div>
                </div>
              ))}
            </div>
          ))}
          {prepData && activeTab == 1 &&
          <div className="card-section" >
            {prepData.preparationTips.map((tip) => (
            <div className="tips-item">
              <img className="blue-icon" src={BulbIcon}/>{tip}
            </div>
            ))}
          </div>}
          {prepData && activeTab == 2 &&
          <div className="card-section" >
            {prepData.keyTopics.map((topic) => (
            <div className="tips-item">
              <img className="blue-icon" src={BookIcon}/>{topic}
            </div>
            ))}
          </div>}
        </div>
      </div>
    </Modal>
  );
}

export default InterviewPrepModal;