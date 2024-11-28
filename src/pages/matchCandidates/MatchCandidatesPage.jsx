import React, { useState, useEffect } from "react";
import "./MatchCandidatesPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { MenuItem, Select, Box, Chip, TextField } from '@mui/material';
import { collection, getDocs, doc, getDoc } from "firebase/firestore";

const MatchCandidatesPage = (props) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]); // List of jobs
  const [selectedJob, setSelectedJob] = useState(''); // Currently selected job
  const [tags, setTags] = useState([]); // Tags related to the selected job
  const [inputTag, setInputTag] = useState(''); // Input for new tags
  const [inputValue, setInputValue] = useState('');

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
            <Select placeholder="Select job title" id="job-title-options" value={selectedJob} onChange={(e) => handleJobSelect(e.target.value)}>
              {jobs.map((job) => (
                <MenuItem key={job.id} value={job.id}>
                  {job.job_title}
                </MenuItem>
              ))}
            </Select>
          </div>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Enter tags"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleAddTag}
            InputProps={{
              startAdornment: (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {tags.map((tag, index) => (
                    <Chip
                      id='tags'
                      key={index}
                      label={tag}
                      onDelete={() => handleDeleteTag(tag)}
                      size="small"
                      sx={{ marginRight: '4px', marginBottom: '2px' }}
                    />
                  ))}
                </Box>
              ),
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MatchCandidatesPage;