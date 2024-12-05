import React from 'react';
import "./CandidateDetailsModal.css";
import { Modal, Chip, CircularProgress, LinearProgress } from '@mui/material';
import { Close, Bookmark } from '../../assets/images';
import { capitalizeFirstLetter, handleRedirectToLinkedIn } from '../../utils/utils';

const CandidateDetailsModal = (props) => {
  const open = props.open;
  const close = props.close;
  const candidate = props.candidate;

  return (
    <Modal open={open} onClose={close}>
      <div className='candidate-modal-container'>
        <div className='candidate-modal-row1'>
          <div className='card-title'>{capitalizeFirstLetter(candidate.contact?.name)}</div>
          <img onClick={close} src={Close} alt='Close'/>
        </div>
        <div className='candidate-modal-row2'>
          <div className='contact-section'>
            <div className='section-title'>Contact Information</div>
            <div className='section-info'>
              <div className='section-label'>Name: <span style={{fontWeight: 400}}>{capitalizeFirstLetter(candidate.contact?.name)}</span></div>
              <div className='section-label'>Email: <span style={{fontWeight: 400}}>{candidate.contact?.email?.toLowerCase()}</span></div>
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
          </div>
        </div>
        <div className='candidate-modal-row1'>
          <button className='send-button' onClick={() => handleRedirectToLinkedIn(candidate.contact?.linkedin)}>Send message</button>
          <button className='view-button' onClick={() => handleRedirectToLinkedIn(candidate.contact?.linkedin)}>View Profile</button>
          <img src={Bookmark} alt="Bookmark" />
        </div>
      </div>
    </Modal>
  );
};

export default CandidateDetailsModal;