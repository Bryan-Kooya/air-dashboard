import React, { useState, useEffect } from "react";
import "./MatchCandidatesPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "../../firebaseConfig";
import { MenuItem, Select, Box, Chip, TextField, CircularProgress } from '@mui/material';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import CandidateCard from "../../components/candidateCard/CandidateCard";
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import mammoth from "mammoth";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import matchCandidates from "../../utils/matchCandidates.json";

// Set the worker source to the local file
GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const MatchCandidatesPage = (props) => {
  const apiBaseUrl = "https://api-3piee3qgbq-uc.a.run.app";
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]); // List of jobs
  const [selectedJob, setSelectedJob] = useState(''); // Currently selected job
  const [selectedJobTitle, setSelectedJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [company, setCompany] = useState('');
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
        setLocation(jobDoc.data().location);
        setCompany(jobDoc.data().company_name);
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
      // Fetch all applicants from Firestore
      const applicantsRef = collection(db, "applicants");
      const applicantsSnapshot = await getDocs(applicantsRef);
  
      if (applicantsSnapshot.empty) {
        console.log("No applicants found in the database.");
        setLoading(false);
        return;
      }
  
      console.log(`Found ${applicantsSnapshot.size} applicants to process.`);
  
      // Process each applicant's resume
      const candidatesData = await Promise.all(
        applicantsSnapshot.docs.map(async (doc) => {
          try {
            const applicant = doc.data();
  
            // Check if the applicant has a job with selectedJobTitle and status 'Rejected'
            const hasRejectedJob = applicant.jobs?.some(
              (job) => job.jobTitle === selectedJobTitle && job.status === "Rejected"
            );
  
            if (hasRejectedJob) {
              console.log(`Skipping applicant ${applicant.name} due to rejected status for job "${selectedJobTitle}".`);
              return null; // Skip processing this applicant
            }
  
            const url = applicant.url;
            const fileName = applicant.fileName;
  
            console.log("Fetching resume from URL:", url);
  
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
  
            const fileType = fileName.split(".").pop().toLowerCase();
            let resumeText = "";
  
            // Extract text from the resume based on file type
            if (fileType === "pdf") {
              resumeText = await extractTextFromPDF(url);
            } else if (fileType === "docx") {
              resumeText = await extractTextFromDocx(url); // Assuming you handle .docx files
            } else {
              resumeText = await response.text(); // Fallback for text files
            }
  
            // Process the resume using an external API
            const res = await fetch(`${apiBaseUrl}/process-resume`, {
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
            console.log("Processed candidate data:", processedCandidate);
  
            // Add job details to the applicant in Firestore
            await updateDoc(doc.ref, {
              jobs: arrayUnion({ jobTitle: selectedJobTitle, status: "Pending" }),
            });
  
            console.log(`Added job "${selectedJobTitle}" to applicant: ${applicant.name}`);
  
            return {
              ...processedCandidate,
              applicantId: doc.id,
              name: applicant.name,
            };
          } catch (error) {
            console.error(`Failed to process resume for applicant: ${error.message}`);
            return null;
          }
        })
      );
  
      // Filter out null results caused by fetch or processing errors
      const validCandidates = candidatesData.filter((candidate) => candidate !== null);

      // Sort candidates by skill match score in descending order
      const sortedCandidates = validCandidates.sort((a, b) => b.skill_match.score - a.skill_match.score);

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
  
  setHeaderTitle();

  return (
    <div className="match-candidates-container">
      <div className="card">
        <div className="input-row">
          <div style={{width: 360}} className="card-row">
            <div className="card-title">Job title:</div>
            <Select
              id="select-input"
              displayEmpty
              value={selectedJob}
              onChange={(e) => handleJobSelect(e.target.value)}
              renderValue={() =>
                selectedJobTitle ? selectedJobTitle : "Select Job title"
              }
            >
              {jobs
                .filter((job) => job.status !== "Inactive") // Exclude jobs with 'Inactive' status
                .map((job) => (
                  <MenuItem id="options" key={job.id} value={job.id}>
                    {job.job_title}
                  </MenuItem>
                ))}
            </Select>
            <div className="card-title">Candidates' count:</div>
            <input 
              placeholder="Enter number of candidates"
              className="job-info-input"
              type="number"
              min="1"
              max="10"
              onInput={(e) => {
                // Ensure the input stays within range
                if (e.target.value > 10) e.target.value = 10;
                if (e.target.value < 1) e.target.value = 1;
              }}
              // onChange={handleInputChange}
            />
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
            company={company}
            location={location}
            handleViewDetails={() => handleViewDetails(candidate)}
          />
        ))}
      </div>}
      <CandidateDetailsModal 
        open={viewDetails} 
        close={() => setViewDetails(false)}
        candidate={selectedCandidate}
        isEditable={false}
      />
    </div>
  );
};

export default MatchCandidatesPage;