import React, { useState } from 'react';
import "./CandidateCard.css";
import { Chip, LinearProgress, Tooltip } from '@mui/material';
import { Bookmark, Briefcase, CheckCircle, EyeIcon, Location, ThumbsDown, ThumbsDownSolid, ThumbsUp, ThumbsUpSolid, ViewIcon } from '../../assets/images';
import { capitalizeFirstLetter } from '../../utils/utils';


const CandidateCard = (props) => {
  const rank = props.rank;
  const candidate = props.candidate;
  const matchedJob = props.matchedJob;
  const handleViewDetails = props.handleViewDetails;
  const handleRejectCandidate = props.handleRejectCandidate;
  const saveCandidate = props.saveCandidate;
  const handleAccurateScore = props.handleAccurateScore;
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

  const handleAccuracy = async (candidate, accuracy) => {
    await handleAccurateScore(candidate, accuracy);
    candidate.accurateScore = accuracy;
  }; 

  return (
    <div className='candidate-card-container'>
      <div className='candidate-card-row1'>
        <div className='candidate-ranking'>
          <div className='candidate-rank'>#{rank}</div>
          <div className='candidate-name'>{capitalizeFirstLetter(candidate.contact.name)}</div>
        </div>
        {candidate.status != "Pending" &&
        <div className='candidate-card-row1'>
          <div style={{gap: 8}} className='status-container'>
            <img src={CheckCircle}/>{candidate.status}
          </div>
        </div>}
      </div>
      <div className='candidate-card-row2'>
        <div style={{alignItems: 'flex-start'}} className='candidate-info'><img src={Location}/> <span>{candidate.contact.location}</span></div>
        <div className='candidate-info'><img src={Briefcase}/> <span>{candidate.total_experience_years} years</span></div>
      </div>
      <div className='candidate-card-row3'>
        <div style={{width: '100%'}}>
          <div className='flex'>
            <div>Job Score:</div>
          </div>
          <div className='score-row'>
            <LinearProgress 
              id='score-bar' 
              variant="determinate" 
              value={candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)}
              sx={{
                "& .MuiLinearProgress-bar": {
                  backgroundColor: (candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)) < 70 ? "#FFB20D" : "#22c55e",
                },
              }}
            />
            <span>{candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)}%</span>
          </div>
        </div>
        <div style={{marginLeft: 'auto', marginBottom: 3 }} className='feedback-row'>
        <Tooltip title="Accurate Score">
          <img 
            style={{height: 20, cursor: 'pointer'}} 
            src={candidate.accurateScore ? ThumbsUpSolid : ThumbsUp}
            onClick={() => handleAccuracy(candidate, true)}
          />
        </Tooltip>
        <Tooltip title="Inaccurate Score">
          <img 
            style={{height: 20, cursor: 'pointer'}} 
            src={candidate.accurateScore === undefined || candidate.accurateScore ? ThumbsDown : ThumbsDownSolid}
            onClick={() => handleAccuracy(candidate, false)}
          />
        </Tooltip>
        </div>
      </div>
      <div className='candidate-card-row3'>
        {/* <div>Matched Job: <span style={{fontWeight: 600}}>{matchedJob}</span></div> */}
        <div style={{display: 'flex', flexWrap: 'wrap'}}>
          {(candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.matchedTags : candidate.scores.skill_match.matching_skills)
          .map((tag, index) => (
            <Chip key={index} style={{ marginLeft: 0}} id='tags' label={tag} />
          ))}
        </div>
      </div>
      <div className='candidate-card-row4'>
        <button disabled={candidate.status == "Selected" || disableButton} className='primary-button' onClick={handleSaveCandidate}>Select Candidate</button>
        <button disabled={candidate.status == "Selected" || disableButton} className='secondary-button' onClick={rejectCandidate}>Reject Candidate</button>
        <Tooltip title="View Details" arrow placement='top'>
          <div className="view-icon">
            <img 
              style={{width: 22}}
              onClick={handleViewDetails} 
              src={EyeIcon} 
              alt="View"
            />
          </div>
        </Tooltip>
      </div>
    </div>
  );
};

export default CandidateCard;
