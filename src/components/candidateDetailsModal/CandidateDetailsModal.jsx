import React, { useState } from 'react';
import "./CandidateDetailsModal.css";
import { Modal, Select, CircularProgress, LinearProgress, Tooltip, MenuItem } from '@mui/material';
import { Close, Bookmark, DeleteIcon, InterviewIcon, EmailIcon } from '../../assets/images';
import { capitalizeFirstLetter, handleRedirectToLinkedIn } from '../../utils/utils';
import ConfirmModal from '../confirmModal/ConfirmModal';
import { db } from '../../firebaseConfig';
import { doc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import ScoreGauge from '../scoreGauge/ScoreGauge';
import IntroEmailModal from '../introEmailModal/IntroEmailModal';
import InterviewPrepModal from '../interviewPrepModal/InterviewPrepModal';
import { apiBaseUrl } from '../../utils/constants';

const CandidateDetailsModal = (props) => {
  const statusList = ['Waiting for approval', 'Selected', 'Interviewed', 'Salary draft'];
  const open = props.open;
  const close = props.close;
  const candidate = props.candidate;
  const isEditable = props.isEditable;
  const userInfo = props.userInfo;
  const updateContact = props.updateContact;
  const email = candidate.contact?.email?.toLowerCase();
  const [showSelectStatus, setShowSelectStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(candidate.status);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showGeneratedEmail, setShowGeneratedEmail] = useState(false);
  const [showInterviewPrep, setShowInterviewPrep] = useState(false);
  const [prepData, setPrepData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleIconClick = () => {
    if (isEditable) setShowConfirm(true);
    else console.log('Save Candidate');
  };

  const handleClose = () => {
    close();
    setShowSelectStatus(false);
  };

  const handleEditOrReject = () => {
    if (isEditable && !showSelectStatus) {
      setShowSelectStatus(true);
      setSelectedStatus(candidate.status);
    } else if (showSelectStatus) {
      setSelectedStatus(candidate.status);
    } else {
      handleUpdateChanges(true);
    }
  };

  const handleSelectStatus = (value) => {
    setSelectedStatus(value);
  };

  const handleViewOrSaveChanges = () => {
    if (isEditable) {
      handleUpdateChanges(false);
    } else {
      handleRedirectToLinkedIn(candidate.contact?.linkedin);
    }
  };

  const handleUpdateChanges = async (isRejected) => {
    try {
      if (!candidate?.id) {
        alert("Candidate ID is missing. Unable to update status.");
        return;
      }
  
      const candidateRef = doc(db, "candidates", candidate.id);
  
      // Update the status of the candidate
      await setDoc(
        candidateRef,
        { status: isRejected ? "Rejected" : selectedStatus },
        { merge: true } // Merge with existing fields to avoid overwriting
      );
  
      alert("Candidate status updated successfully!");
      close();
      props.loadCandidates(); // Reload candidates to reflect the changes
    } catch (error) {
      console.error("Error updating candidate status:", error);
      alert("An error occurred while updating candidate status.");
    }
  };  

  const generatePrep = async () => {
    setLoading(true);
    console.log("Candidate: ", candidate);
    try {
      if (
        candidate?.interviewPrep &&
        (
          candidate.interviewPrep.questions?.length > 0 ||
          candidate.interviewPrep.keyTopics?.length > 0 ||
          candidate.interviewPrep.preparationTips?.length > 0
        )
      ) {
        // Use existing interview prep data
        console.log("Using existing interview prep data.");
        setPrepData(candidate.interviewPrep);
      } else {
        // Generate new interview prep data
        const response = await fetch(`${apiBaseUrl}/generate-interview-prep`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobTitle: candidate.jobTitle,
            jobDescription: candidate.jobDescription,
            resumeData: candidate.resumeText,
          }),
        });
  
        if (!response.ok) {
          throw new Error(await response.text());
        }
  
        const data = await response.json();
        setPrepData(data);
  
        // Update Firestore if editable
        if (isEditable) {
          const candidateDoc = doc(db, "candidates", candidate.id);
          await updateDoc(candidateDoc, { interviewPrep: data });
          console.log("Updated Firestore with new interview prep data.");
  
          // Update the candidate locally
          candidate.interviewPrep = data; // Update the local candidate object
          console.log("Updated candidate locally with new interview prep data.");
        } else {
          await updateContact(candidate, candidate.status, data);
          console.log("Updated contact with new interview prep data.");
        }
      }
    } catch (error) {
      console.error("Error generating interview prep:", error);
      alert("Failed to generate interview prep. Please try again later.");
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };  

  const handleInterviewPrep = async () => {
    await generatePrep();
    setTimeout(() => setShowInterviewPrep(true), 800);
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div className='candidate-modal-container'>
        <div className='candidate-modal-row1'>
          <div className='card-title'>{capitalizeFirstLetter(candidate.contact?.name)}</div>
          <img onClick={handleClose} src={Close} alt='Close'/>
        </div>
        <div className='candidate-modal-row2'>
          {isEditable &&
          <div className='contact-section'>
            <div className='section-title'>Status</div>
            {showSelectStatus ?
            <Select 
              id="select-input"
              sx={{width: 210}}
              displayEmpty
              value={selectedStatus} 
              onChange={(e) => handleSelectStatus(e.target.value)}
            >
              {statusList.map((status, index) => (
                <MenuItem key={index} value={status}>
                  <div className='status-container'>
                    <div className={`status-badge ${status?.toLowerCase().replace(/\s/g, "-")}`}></div>{status}
                  </div>
                </MenuItem>
              ))}
            </Select> :
            <div className='status-container'>
              <div className={`status-badge ${candidate.status?.toLowerCase().replace(/\s/g, "-")}`}></div>{candidate.status}
            </div>}
          </div>}
          <div className='contact-section'>
            <div className='section-title'>Detailed Scores</div>
            <div  className='metric-section'>
              <ScoreGauge title={"Resume Quality"} value={candidate.scores?.overall}/>
              <ScoreGauge title={"Job Match"} value={candidate.skill_match?.score}/>
              <div className='action-button-container'>
                <button disabled={loading} onClick={handleInterviewPrep} className='action-button'>
                  {loading ? 
                    <>
                      <CircularProgress thickness={5} size={10} color='black'/>Generating...
                    </> : 
                    <>
                    <img src={InterviewIcon}/>Interview Prep
                    </>
                  }
                </button>
                <button onClick={() => setShowGeneratedEmail(true)} className='action-button'><img src={EmailIcon}/>Generate Intro Email</button>
              </div>
            </div>
          </div>
          {/* <div className='contact-section'>
            <div className='section-title'>Detailed Scores</div>
            <div>
              <div>Overall Score</div>
              <div className='score-row'>
                <LinearProgress
                  id='score-bar' 
                  variant="determinate" 
                  value={candidate.scores?.overall}
                  sx={{
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: "#0A66C2",
                    },
                  }}
                />
                <span>{candidate.scores?.overall}%</span>
              </div>
            </div>
            <div>
              <div>Job Match</div>
              <div className='score-row'>
                <LinearProgress 
                  id='score-bar' 
                  variant="determinate" 
                  value={candidate.skill_match?.score}
                  sx={{
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: "#FFB20D",
                    },
                  }}
                />
                <span>{candidate.skill_match?.score}%</span>
              </div>
            </div>
          </div> */}
          <div className='contact-section'>
            <div className='section-title'>Experience ({candidate.scores?.experience.score}%)</div>
            <div>{candidate.scores?.experience.feedback}</div>
            {candidate.work_experience?.map((experience) => (
              <div className='section-label'>
                <div>{experience.title}</div>
                <div style={{fontWeight: 400, marginTop: 8}}>{experience.company}</div>
                <div style={{fontWeight: 400, color: '#929292'}}>{experience.duration}</div>
                {experience.highlights?.map((highlight) => (
                  <ul style={{fontWeight: 400, margin: 6, paddingLeft: 20}}>
                    <li>{highlight}</li>
                  </ul>
                ))}
              </div>
            ))}
          </div>
          <div className='contact-section'>
            <div className='section-title'>Contact Information</div>
            <div className='section-info'>
              <div className='section-label'>Name: <span style={{fontWeight: 400}}>{capitalizeFirstLetter(candidate.contact?.name)}</span></div>
              <div className='section-label'>Email: <span style={{fontWeight: 400}}>{email}</span></div>
              <div className='section-label'>Phone: <span style={{fontWeight: 400}}>{candidate.contact?.phone}</span></div>
              <div className='section-label'>Location: <span style={{fontWeight: 400}}>{capitalizeFirstLetter(candidate.contact?.location)}</span></div>
              <div className='section-label'>LinkedIn: <a 
                  onClick={() => handleRedirectToLinkedIn(candidate.contact?.linkedin)} 
                  className='linkedin-link' 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {capitalizeFirstLetter(candidate.contact?.name)}
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className='candidate-modal-row1'>
          <button 
            disabled={!isEditable && candidate.status == "Selected"}
            className='send-button' 
            onClick={handleEditOrReject}
          >
            {(isEditable && !showSelectStatus) ? 'Edit Candidate' : showSelectStatus ? 'Cancel' : 'Reject Candidate'}
          </button>
          <button 
            className='view-button' 
            onClick={handleViewOrSaveChanges}
          >
            {showSelectStatus ? 'Save All Changes' : 'View Profile' }
          </button>
          <Tooltip title={isEditable ? 'Delete' : 'Interested'} arrow placement='top'>
            <img onClick={handleIconClick} src={isEditable ? DeleteIcon : Bookmark} alt="Bookmark" />
          </Tooltip>
        </div>
        <ConfirmModal
          open={showConfirm}
          close={() => setShowConfirm(false)}
        />
        <IntroEmailModal 
          open={showGeneratedEmail} 
          close={() => setShowGeneratedEmail(false)} 
          candidate={candidate} 
          jobTitle={candidate.jobTitle}
          userInfo={userInfo}
          hiringCompany={candidate.company}
        />
        <InterviewPrepModal
          open={showInterviewPrep} 
          close={() => setShowInterviewPrep(false)} 
          prepData={prepData}
        />
      </div>
    </Modal>
  );
};

export default CandidateDetailsModal;