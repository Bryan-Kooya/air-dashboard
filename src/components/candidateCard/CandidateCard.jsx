import React from 'react';
import "./CandidateCard.css";
import { Chip } from '@mui/material';
import { Bookmark } from '../../assets/images';

const CandidateCard = (props) => {
  const rank = props.rank;
  const name = props.name;
  const score = props.score;
  const location = props.location;
  const experience = props.experience;
  const matchedJob = props.matchedJob;
  const tags = props.tags;

  return (
    <div className='candidate-card-container'>
      <div className='candidate-card-row1'>
        <div className='candidate-ranking'>
          <div className='candidate-rank'>#{rank}</div>
          <div className='candidate-name'>{name}</div>
        </div>
        <div className='candidate-score'>Score: {score}</div>
      </div>
      <div className='candidate-card-row2'>
        <div className='candidate-location'>Location: {location}</div>
        <div className='candidate-years'>Experience: {experience}</div>
      </div>
      <div className='candidate-card-row3'>
        <div>Matched Job: {matchedJob}</div>
        <div style={{display: 'flex', flexWrap: 'wrap'}}>
          {tags.map((tag, index) => (
            <Chip key={index} style={{ marginLeft: 0}} id='tags' label={tag} />
          ))}
        </div>
      </div>
      <div className='candidate-card-row4'>
        <button className='send-button'>Send messages</button>
        <button className='view-button'>View Profile</button>
        <img src={Bookmark} alt="Bookmark" />
      </div>
    </div>
  );
};

export default CandidateCard;