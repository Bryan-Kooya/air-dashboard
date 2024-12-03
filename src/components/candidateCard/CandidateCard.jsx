import React from 'react';
import "./CandidateCard.css";
import { Chip, LinearProgress } from '@mui/material';
import { Bookmark } from '../../assets/images';
import { capitalizeFirstLetter, handleRedirectToLinkedIn } from '../../utils/utils';

const CandidateCard = (props) => {
  const rank = props.rank;
  const candidate = props.candidate;
  const name = candidate.contact.name;
  const score = candidate.scores.overall;
  const matchScore = candidate.skill_match.score;
  const location = candidate.contact.location;
  const experience = candidate.total_experience_years;
  const matchedJob = props.matchedJob;
  const tags = candidate.skill_match.matching_skills;
  const handleViewDetails = props.handleViewDetails;

  return (
    <div className='candidate-card-container'>
      <div className='candidate-card-row1'>
        <div className='candidate-ranking'>
          <div className='candidate-rank'>#{rank}</div>
          <div className='candidate-name'>{capitalizeFirstLetter(name)}</div>
        </div>
        {/* <div className='candidate-score'>Score: {score}/10</div> */}
      </div>
      <div className='candidate-card-row2'>
        <div className='candidate-location'>Location: <span style={{fontWeight: 600}}>{capitalizeFirstLetter(location)}</span></div>
        <div className='candidate-years'>Experience: <span style={{fontWeight: 600}}>{experience} years</span></div>
      </div>
      <div className='candidate-card-row3'>
        <div>
          <div>Overall Score</div>
          <div className='score-row'>
            <LinearProgress
              id='score-bar' 
              variant="determinate" 
              value={score}
              sx={{
                "& .MuiLinearProgress-bar": {
                  backgroundColor: "#0A66C2",
                },
              }}
            />
            <span>{score}%</span>
          </div>
        </div>
        <div>
          <div>Job Match</div>
          <div className='score-row'>
            <LinearProgress 
              id='score-bar' 
              variant="determinate" 
              value={matchScore}
              sx={{
                "& .MuiLinearProgress-bar": {
                  backgroundColor: "#FFB20D",
                },
              }}
            />
            <span>{matchScore}%</span>
          </div>
        </div>
      </div>
      <div className='candidate-card-row3'>
        <div>Matched Job: <span style={{fontWeight: 600}}>{matchedJob}</span></div>
        <div style={{display: 'flex', flexWrap: 'wrap'}}>
          {tags.map((tag, index) => (
            <Chip key={index} style={{ marginLeft: 0}} id='tags' label={tag} />
          ))}
        </div>
      </div>
      <div className='candidate-card-row4'>
        <button className='send-button' onClick={() => handleRedirectToLinkedIn(candidate.contact?.linkedin)}>Send message</button>
        <button className='view-button' onClick={handleViewDetails}>View Details</button>
        <img src={Bookmark} alt="Bookmark" />
      </div>
    </div>
  );
};

export default CandidateCard;