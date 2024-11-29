import React, { useState, useEffect } from "react";
import "./MatchCandidatesPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { MenuItem, Select, Box, Chip, TextField, CircularProgress } from '@mui/material';
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import CandidateCard from "../../components/candidateCard/CandidateCard";

const candidates = [
  {
    name: "Alice Norman",
    score: "9.5/10",
    location: "New York",
    experience: "5 years",
    tags: ["ReactJS", "JavaScript", "HTML", "CSS", "Redux", "VueJS"],
  },
  {
    name: "Bob Smith",
    score: "8.8/10",
    location: "San Francisco",
    experience: "7 years",
    tags: ["NodeJS", "Express", "MongoDB", "REST APIs", "GraphQL"],
  },
  {
    name: "Clara Johnson",
    score: "9.2/10",
    location: "Austin",
    experience: "6 years",
    tags: ["ReactJS", "NodeJS", "TypeScript", "PostgreSQL", "Docker"],
  },
  {
    name: "Daniel Brown",
    score: "8.5/10",
    location: "Chicago",
    experience: "4 years",
    tags: ["Figma", "Sketch", "Adobe XD", "User Research", "Wireframing"],
  },
];

const MatchCandidatesPage = (props) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]); // List of jobs
  const [selectedJob, setSelectedJob] = useState(''); // Currently selected job
  const [tags, setTags] = useState([]); // Tags related to the selected job
  const [inputTag, setInputTag] = useState(''); // Input for new tags
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCandidates, setShowCandidate] = useState(false);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobsCollection = collection(db, 'jobs');
        const jobSnapshot = await getDocs(jobsCollection);
        const jobData = jobSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setJobs(jobData);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    fetchJobs();
  }, []);

  const handleJobSelect = async (jobId) => {
    setSelectedJob(jobId);
    try {
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      if (jobDoc.exists()) {
        const tagsData = jobDoc.data().tags;
        // Convert the comma-separated string into an array
        setTags(tagsData ? tagsData.split(',') : []);
      } else {
        console.error('No such document!');
        setTags([]);
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    }
  };

  const handleDeleteTag = (tagToDelete) => {
    setTags((prevTags) => prevTags.filter((tag) => tag !== tagToDelete));
  };

  const handleAddTag = () => {
    if (inputTag && !tags.includes(inputTag)) {
      setTags((prevTags) => [...prevTags, inputTag]);
      setInputTag('');
    }
  };

  const setHeaderTitle = () => {
    props.title("Match Candidates");
    props.subtitle("Choose the job title and paste tags below to find the best candidates.");
  };

  const handleMatchCandidates = () => {
    setShowCandidate(true);
  }

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };
  
  setHeaderTitle();

  return (
    <div className="match-candidates-container">
      <div className="card">
        <div className="input-row">
          <div style={{width: 360}} className="card-row">
            <div className="card-title">Job Title:</div>
            <Select id="match-candidates-input" value={selectedJob} onChange={(e) => handleJobSelect(e.target.value)}>
              {jobs.map((job) => (
                <MenuItem key={job.id} value={job.id}>
                  {job.job_title}
                </MenuItem>
              ))}
            </Select>
          </div>
          <div className="card-row">
            <div className="card-title">Job Description (tags):</div>
            <Box>
              {tags.map((tag, index) => (
                <Chip
                  id='tags'
                  key={index}
                  label={tag}
                  onDelete={() => handleDeleteTag(tag)}
                />
              ))}
            </Box>
          </div>
        </div>
        <button onClick={handleMatchCandidates} className='match-button' disabled={loading}>
          {loading ? <CircularProgress thickness={6} size={20} sx={{ color: '#C3C3C3' }} /> : 'Match Candidates'}
        </button>
      </div>
      {showCandidates && <div className="match-result">Match Results: 4 Candidates</div>}
      {showCandidates &&
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 16}}>
        {candidates.map((candidate, index) => (
          <CandidateCard
            key={index}
            rank={index + 1}
            name={candidate.name}
            score={candidate.score}
            location={candidate.location}
            experience={candidate.experience}
            matchJob={selectedJob}
            tags={candidate.tags}
          />
        ))}
      </div>}
    </div>
  );
};

export default MatchCandidatesPage;