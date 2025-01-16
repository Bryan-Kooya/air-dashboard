import React, { useState } from 'react';
import "./CandidateCard.css";
import { Chip, LinearProgress, Tooltip } from '@mui/material';
import { Bookmark } from '../../assets/images';
import { doc, setDoc, serverTimestamp, collection, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db } from '../../firebaseConfig';
import { capitalizeFirstLetter } from '../../utils/utils';


const CandidateCard = (props) => {
  const rank = props.rank;
  const matchedJob = props.matchedJob;
  const handleViewDetails = props.handleViewDetails;
  const hiringCompany = props.hiringCompany;
  const location = props.location;
  const updateContact = props.updateContact;
  const handleRejectCandidate = props.handleRejectCandidate;
  const userId = props.userId;
  const candidate = props.candidate;

  const handleSaveCandidate = async () => {
    try {
      if (!candidate?.contact?.name || !matchedJob) {
        alert("Candidate name or job is missing. Unable to save.");
        return;
      }

      const updatedCandidate = {
        ...candidate,
        status: "Selected", // Add or update the status
      };

      // Prepare searchable keywords
      const searchKeywords = [
        updatedCandidate?.contact?.name?.toLowerCase() || "",
        "selected", // Added status (or dynamically set it)
        matchedJob?.toLowerCase() || "",
      ].filter(Boolean); // Remove empty values

      const candidateData = {
        ...updatedCandidate,
        userId: userId,
        company: hiringCompany,
        location: location,
        searchKeywords,
        timestamp: serverTimestamp(), // Add server-side timestamp
      };
  
      // Generate a unique ID for the candidate in Firestore
      const candidatesRef = collection(db, "candidates");
  
      // Check if a candidate with the same name and job already exists
      const querySnapshot = await getDocs(
        query(
          candidatesRef,
          where("contact.name", "==", candidate.contact.name),
          where("job", "==", matchedJob)
        )
      );
  
      if (!querySnapshot.empty) {
        // If a candidate with the same name and job exists, skip saving
        alert("Candidate with the same name and job already exists.");
        return;
      }
  
      const newCandidateRef = doc(candidatesRef); // Automatically generates a unique ID
      await setDoc(newCandidateRef, candidateData);
      await updateContact(candidate, "Selected", candidate.interviewPrep);

      // Update the local state to reflect the change
      // setCandidate(updatedCandidate);

      alert("Candidate saved successfully!");
    } catch (error) {
      console.error("Error saving candidate:", error);
      alert("An error occurred while saving the candidate.");
    }
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
          <div>Overall Score</div>
          <div className='score-row'>
            <LinearProgress
              id='score-bar' 
              variant="determinate" 
              value={candidate.scores.overall}
              sx={{
                "& .MuiLinearProgress-bar": {
                  backgroundColor: "#0A66C2",
                },
              }}
            />
            <span>{candidate.scores.overall}%</span>
          </div>
        </div>
        <div>
          <div>Job Match</div>
          <div className='score-row'>
            <LinearProgress 
              id='score-bar' 
              variant="determinate" 
              value={candidate.skill_match.score}
              sx={{
                "& .MuiLinearProgress-bar": {
                  backgroundColor: candidate.skill_match.score < 85 ? "#FFB20D" : "#22c55e",
                },
              }}
            />
            <span>{candidate.skill_match.score}%</span>
          </div>
        </div>
      </div>
      <div className='candidate-card-row3'>
        <div>Matched Job: <span style={{fontWeight: 600}}>{matchedJob}</span></div>
        <div style={{display: 'flex', flexWrap: 'wrap'}}>
          {candidate.skill_match.matching_skills.map((tag, index) => (
            <Chip key={index} style={{ marginLeft: 0}} id='tags' label={tag} />
          ))}
        </div>
      </div>
      <div className='candidate-card-row4'>
        <button disabled={candidate.status == "Selected"} className='send-button' onClick={handleRejectCandidate}>Reject Candidate</button>
        <button className='view-button' onClick={handleViewDetails}>View Details</button>
        <Tooltip title="Interested" arrow placement='top'>
          <img onClick={handleSaveCandidate} src={Bookmark} alt="Bookmark"/>
        </Tooltip>
      </div>
    </div>
  );
};

export default CandidateCard;
