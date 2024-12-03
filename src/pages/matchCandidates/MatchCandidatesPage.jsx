import React, { useState, useEffect } from "react";
import "./MatchCandidatesPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "../../firebaseConfig";
import { MenuItem, Select, Box, Chip, TextField, CircularProgress } from '@mui/material';
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import CandidateCard from "../../components/candidateCard/CandidateCard";
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import mammoth from "mammoth";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import matchCandidates from "../../utils/matchCandidates.json";

// Set the worker source to the local file
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MatchCandidatesPage = (props) => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]); // List of jobs
  const [selectedJob, setSelectedJob] = useState(''); // Currently selected job
  const [selectedJobTitle, setSelectedJobTitle] = useState('');
  const [tags, setTags] = useState([]); // Tags related to the selected job
  const [inputTag, setInputTag] = useState(''); // Input for new tags
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCandidates, setShowCandidate] = useState(false);
  const [viewDetails, setViewDetails] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState([]);

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
        const jobTitle = jobDoc.data().job_title;
        // Convert the comma-separated string into an array
        setTags(tagsData ? tagsData.split(',') : []);
        setSelectedJobTitle(jobTitle);
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

  async function extractTextFromPDF(pdfUrl) {
    const loadingTask = getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
  
    let extractedText = "";
  
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
  
      // Concatenate all text items into a single string
      textContent.items.forEach((item) => {
        extractedText += item.str + " ";
      });
    }
  
    return extractedText.trim(); // Return the extracted text
  }

  async function extractTextFromDocx(docxUrl) {
    const response = await fetch(docxUrl);
    const arrayBuffer = await response.arrayBuffer();
  
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value; // Extracted plain text
  }

  const handleMatchCandidates = async () => {
    console.log("Starting candidate matching process...");
    setLoading(true);
  
    try {
      const resumesRef = ref(storage, "resumes");
      const resumesList = await listAll(resumesRef);
  
      console.log(`Found ${resumesList.items.length} resumes to process.`);
      const candidatesData = await Promise.all(
        resumesList.items.map(async (resumeRef) => {
          try {
            const url = await getDownloadURL(resumeRef);
            console.log("Fetching resume from URL:", url);
  
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
  
            const fileType = resumeRef.name.split(".").pop().toLowerCase();
            let resumeText = "";
  
            if (fileType === "pdf") {
              resumeText = await extractTextFromPDF(url);
            } else if (fileType === "docx") {
              resumeText = await extractTextFromDocx(url); // Assuming you handle .docx
            } else {
              resumeText = await response.text(); // Fallback for text files
            }

            const res = await fetch("/process-resume", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ resumeText, tags }),
            });
            if (!res.ok) {
              const error = await res.json();
              console.error("Error:", error);
              throw new Error(error.error);
            }

            const processedCandidate = await res.json();
            console.log("Processed candidate data:", processedCandidate); // Log the processed data
            return processedCandidate;
          } catch (error) {
            console.error(`Failed to process resume: ${error.message}`);
            return null;
          }
        })
      );
  
      // Filter out null results caused by fetch or processing errors
      const validCandidates = candidatesData.filter((candidate) => candidate !== null);
      // const validCandidates = matchCandidates;

      // Sort candidates by score in descending order
      const sortedCandidates = validCandidates.sort((a, b) => b.scores.overall - a.scores.overall);

      console.log(`Successfully processed and sorted ${sortedCandidates.length} candidates.`);
      setCandidates(sortedCandidates);
      setShowCandidate(true);
    } catch (error) {
      console.error("Error during candidate matching process:", error.message);
    } finally {
      setLoading(false);
      console.log("Candidate matching process complete.");
    }
  };

  const handleViewDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setViewDetails(true);
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
            <Select 
              id="match-candidates-input" 
              displayEmpty
              value={selectedJob} 
              onChange={(e) => handleJobSelect(e.target.value)}
              renderValue={() =>
                selectedJobTitle ? selectedJobTitle : "Select Job title"
              }
            >
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
      {showCandidates && <div className="match-result">Match Results: {candidates.length} Candidate(s)</div>}
      {showCandidates &&
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 16}}>
        {candidates.map((candidate, index) => (
          <CandidateCard
            key={index}
            rank={index + 1}
            candidate={candidate}
            matchedJob={selectedJobTitle}
            handleViewDetails={() => handleViewDetails(candidate)}
          />
        ))}
      </div>}
      <CandidateDetailsModal 
        open={viewDetails} 
        close={() => setViewDetails(false)}
        candidate={selectedCandidate}
      />
    </div>
  );
};

export default MatchCandidatesPage;