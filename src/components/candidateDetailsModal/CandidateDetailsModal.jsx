import React, { useState } from 'react';
import "./CandidateDetailsModal.css";
import { Modal, Select, CircularProgress, LinearProgress, Tooltip, MenuItem } from '@mui/material';
import { Close, Bookmark, DeleteIcon } from '../../assets/images';
import { capitalizeFirstLetter, handleRedirectToLinkedIn } from '../../utils/utils';
import ConfirmModal from '../confirmModal/ConfirmModal';
import { db } from '../../firebaseConfig';
import { doc, setDoc } from "firebase/firestore";

const CandidateDetailsModal = (props) => {
  const statusList = ['Waiting for approval', 'Selected', 'Interviewed', 'Salary draft'];
  const open = props.open;
  const close = props.close;
  const candidate = props.candidate;
  const isEditable = props.isEditable;
  const handleMatchCandidates = props.handleMatchCandidates;
  const email = candidate.contact?.email?.toLowerCase();
  const [showSelectStatus, setShowSelectStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(candidate.status);
  const [showConfirm, setShowConfirm] = useState(false);

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
      setSelectedStatus(false);
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
          <div className='contact-section'>
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
          </div>
          <div className='contact-section'>
            <div className='section-title'>Experience ({candidate.scores?.experience.score}%)</div>
            <div>{candidate.scores?.experience.feedback}</div>
            {candidate.work_experience?.map((experience) => (
              <div className='section-label'>
                <div>{experience.title}</div>
                <div style={{fontWeight: 400, marginTop: 8}}>{experience.company}</div>
                <div style={{fontWeight: 400, color: '#929292'}}>{experience.duration}</div>
                {experience.highlights.map((highlight) => (
                  <ul style={{fontWeight: 400, margin: 6, paddingLeft: 20}}>
                    <li>{highlight}</li>
                  </ul>
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className='candidate-modal-row1'>
          <button 
            disabled={candidate.status == "Selected"}
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
      </div>
    </Modal>
  );
};

export default CandidateDetailsModal;