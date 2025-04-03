import React, { useState } from 'react';
import "./CandidateCard.css";
import { Chip, LinearProgress, Tooltip } from '@mui/material';
import { Bookmark } from '../../assets/images';
import { doc, setDoc, serverTimestamp, collection, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db } from '../../firebaseConfig';
import { capitalizeFirstLetter } from '../../utils/utils';


const CandidateCard = (props) => {
  const rank = props.rank;
  const candidate = props.candidate;
  const matchedJob = props.matchedJob;
  const handleViewDetails = props.handleViewDetails;
  const handleRejectCandidate = props.handleRejectCandidate;
  const saveCandidate = props.saveCandidate;
  const [loadSaveButton, setLoadSaveButton] = useState(false);
  const [disableButton, setDisableButton] = useState(false);

  const handleSaveCandidate = async () => {
    setLoadSaveButton(true);
    await saveCandidate(candidate);
    setTimeout(() => setLoadSaveButton(false), 700);
  };

  const rejectCandidate = async () => {
    setDisableButton(true);
    await handleRejectCandidate();
  };

  return (
    <div className='candidate-card-container'>
      {candidate.status != "Pending" &&
      <div className='candidate-card-row1'>
        <div className='status-container'>
          <div className={`status-badge ${candidate.status?.toLowerCase().replace(/\s/g, "-")}`}></div>{candidate.status}
        </div>
      </div>}
      <div className='candidate-card-row1'>
        <div className='candidate-ranking'>
          <div className='candidate-rank'>#{rank}</div>
          <div className='candidate-name'>{capitalizeFirstLetter(candidate.contact.name)}</div>
        </div>
      </div>
      <div className='candidate-card-row2'>
        <div className='candidate-location'>Location: <span style={{fontWeight: 600}}>{candidate.contact.location}</span></div>
        <div className='candidate-years'>Experience: <span style={{fontWeight: 600}}>{candidate.total_experience_years} years</span></div>
      </div>
      <div className='candidate-card-row3'>
        <div>
          <div>Overall Match</div>
          <div className='score-row'>
            <LinearProgress
              id='score-bar' 
              variant="determinate" 
              value={Math.round(candidate.scores?.overall)}
              sx={{
                "& .MuiLinearProgress-bar": {
                  backgroundColor: "#0A66C2",
                },
              }}
            />
            <span>{Math.round(candidate.scores?.overall)}%</span>
          </div>
        </div>
        <div>
          <div>Job Match</div>
          <div className='score-row'>
            <LinearProgress 
              id='score-bar' 
              variant="determinate" 
              value={candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)}
              sx={{
                "& .MuiLinearProgress-bar": {
                  backgroundColor: (candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)) < 85 ? "#FFB20D" : "#22c55e",
                },
              }}
            />
            <span>{candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)}%</span>
          </div>
        </div>
      </div>
      <div className='candidate-card-row3'>
        <div>Matched Job: <span style={{fontWeight: 600}}>{matchedJob}</span></div>
        <div style={{display: 'flex', flexWrap: 'wrap'}}>
          {candidate.scores.skill_match.matching_skills.map((tag, index) => (
            <Chip key={index} style={{ marginLeft: 0}} id='tags' label={tag} />
          ))}
        </div>
      </div>
      <div className='candidate-card-row4'>
        <button disabled={candidate.status == "Selected" || disableButton} className='send-button' onClick={rejectCandidate}>Reject Candidate</button>
        <button className='view-button' onClick={handleViewDetails}>View Details</button>
        <Tooltip title="Interested" arrow placement='top'>
          {candidate.status != "Selected" && 
          <img 
            className={`save-icon ${loadSaveButton ? 'disabled' : ''}`} 
            onClick={handleSaveCandidate} 
            src={Bookmark} 
            alt="Bookmark"
          />}
        </Tooltip>
      </div>
    </div>
  );
};

export default CandidateCard;
