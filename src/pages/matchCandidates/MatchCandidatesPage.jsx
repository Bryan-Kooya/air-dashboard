import React, { useState, useEffect } from "react";
import "./MatchCandidatesPage.css"
import { useNavigate } from "react-router-dom";
import { db } from "../../firebaseConfig";
import { MenuItem, Select, Box, Chip, CircularProgress } from '@mui/material';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, query, limit, where, orderBy, startAt, endAt } from "firebase/firestore";
import CandidateCard from "../../components/candidateCard/CandidateCard";
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import { capitalizeFirstLetter } from "../../utils/utils";
import { apiBaseUrl } from "../../utils/constants";

const MatchCandidatesPage = (props) => {
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
  const userId = props.userId;

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

  const handleMatchCandidates = async (isRejected) => {
    console.log("Starting candidate matching process...");
    setLoading(true);
  
    try {
      // Determine the number of candidates to process
      const candidateCountInput = parseInt(
        document.querySelector(".job-info-input").value,
        10
      );
      const candidateCount = isRejected ? 1 : candidateCountInput || 1;
  
      if (candidateCount < 1 || candidateCount > 10) {
        alert("Please enter a valid number between 1 and 10.");
        setLoading(false);
        return;
      }
  
      console.log(`Fetching ${isRejected ? "next" : `up to ${candidateCount}`} contacts...`);
  
      // Prioritized query: fetch contacts with matching job_tags first
      const contactsRef = collection(db, "contacts");
      const prioritizedQuery = query(
        contactsRef,
        where("userId", "==", userId),
        where("job_tags", "array-contains", selectedJobTitle),
        limit(candidateCount)
      );
      const prioritizedSnapshot = await getDocs(prioritizedQuery);
  
      let contacts = prioritizedSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        ref: doc.ref,
      }));
  
      // If prioritized contacts are insufficient, fetch additional ones
      if (contacts.length < candidateCount) {
        const additionalQuery = query(
          contactsRef,
          where("userId", "==", userId),
          orderBy("timestamp", "desc"),
          limit(candidateCount - contacts.length)
        );
        const additionalSnapshot = await getDocs(additionalQuery);
  
        const additionalContacts = additionalSnapshot.docs
          .filter((doc) => !contacts.some((contact) => contact.id === doc.id)) // Avoid duplicates
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            ref: doc.ref,
          }));
  
        contacts = [...contacts, ...additionalContacts];
      }
  
      if (contacts.length === 0) {
        console.log("No contacts found in the database.");
        setLoading(false);
        return;
      }
  
      // Separate contacts into two groups
      const existingJobCandidates = [];
      const unprocessedContacts = [];
  
      for (const contact of contacts) {
        const jobData = contact.jobs?.find((job) => job.jobTitle === selectedJobTitle && job.status !== "Rejected");
        const { name, email, phone, linkedin, location, fileName, url } = contact;

        if (jobData) {
          // Use existing data for the CandidateCard component
          existingJobCandidates.push({
            contact: { name, email, phone, linkedin, location, fileName, url },
            ...jobData,
          });
        } else {
          unprocessedContacts.push(contact);
        }
      }
  
      console.log(
        `Using ${existingJobCandidates.length} existing candidates and processing ${unprocessedContacts.length} resumes.`
      );
  
      // Process unprocessed contacts
      const processedCandidates = await Promise.all(
        unprocessedContacts.map(async (contact) => {
          try {
            const { resumeText, name, email, phone, linkedin, location, fileName, url } = contact;
  
            if (!resumeText) {
              throw new Error("Resume text is missing for contact: " + contact.name);
            }
  
            // Call external API to process the resume
            const res = await fetch(`${apiBaseUrl}/match-resume`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ resumeText, tags }),
            });
  
            if (!res.ok) {
              const error = await res.json();
              console.error("Error processing resume:", error);
              throw new Error(error.error);
            }
  
            const processedCandidate = await res.json();
            console.log("Processed candidate data:", processedCandidate);
  
            // Update contact in Firestore with the new job status
            await updateDoc(contact.ref, {
              jobs: arrayUnion({
                jobTitle: selectedJobTitle,
                status: "Pending",
                ...processedCandidate,
              }),
            });
  
            console.log(`Added job "${selectedJobTitle}" to contact: ${contact.name}`);
            return {
              contact: { name, email, phone, linkedin, location, fileName, url },
              ...processedCandidate,
            };
          } catch (error) {
            console.error(`Failed to process resume for contact: ${error.message}`);
            return null;
          }
        })
      );
  
      // Filter out null candidates and sort by skill match score
      const validProcessedCandidates = processedCandidates.filter((candidate) => candidate !== null);
      const allCandidates = [...existingJobCandidates, ...validProcessedCandidates];

      const sortedCandidates = allCandidates.sort(
        (a, b) => b.skill_match.score - a.skill_match.score
      );

      console.log('validProcessedCandidates', validProcessedCandidates);
      console.log('allCandidates', allCandidates)
  
      console.log(`Successfully processed and retrieved ${sortedCandidates.length} candidates.`);
      setCandidates((prevCandidates) => (isRejected ? [...prevCandidates, ...sortedCandidates] : sortedCandidates));
      setShowCandidate(true);
    } catch (error) {
      console.error("Error during candidate matching process:", error.message);
    } finally {
      setLoading(false);
      console.log("Candidate matching process complete.");
    }
  };
        
  const updateContact = async (candidate, status) => {
    try {  
      const contactsRef = collection(db, "contacts");
  
      // Check if the contact with the same name already exists
      const querySnapshot = await getDocs(
        query(contactsRef, where("name", "==", capitalizeFirstLetter(candidate.contact.name)))
      );
  
      if (querySnapshot.empty) {
        console.error("Contact not found. Please ensure the candidate exists in the 'contacts' collection.");
        return;
      }
  
      const contactDoc = querySnapshot.docs[0]; // Get the existing document
      const contactDocRef = contactDoc.ref;
  
      // Get the existing jobs or set it as an empty array
      const existingJobs = contactDoc.data().jobs || [];
  
      // Check if the job already exists in the 'jobs' field
      const jobIndex = existingJobs.findIndex((job) => job.jobTitle === selectedJobTitle);
  
      if (jobIndex >= 0) {
        // If the job exists, update its status
        existingJobs[jobIndex].status = status;
      } else {
        // Add the new job if it doesn't exist
        existingJobs.push({ jobTitle: selectedJobTitle, status: status });
      }
  
      // Update the contact's document with the updated jobs field
      await updateDoc(contactDocRef, {
        jobs: existingJobs,
      });

      // Update the local candidates state
      setCandidates((prevCandidates) =>
        prevCandidates.map((c) =>
          c.contact.name === candidate.contact.name
            ? { ...c, status } // Update the status of the matched candidate
            : c // Leave other candidates unchanged
        )
      );
  
      console.log("Candidate's job information updated successfully!");
    } catch (error) {
      console.error("Error updating candidate's job information:", error);
    }
  };  

  const handleRejectCandidate = async (candidate) => {
    await updateContact(candidate, "Rejected");
    handleMatchCandidates(true);
  };

  const handleViewDetails = (candidate) => {
    setSelectedCandidate(candidate);
    setViewDetails(true);
  }

  (function setHeaderTitle() {
    props.title("Match Candidates");
    props.subtitle("Choose the job title and paste tags below to find the best candidates.");
  })();

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
                .filter((job) => job.status !== "Not Active") // Exclude jobs with 'Not Active' status
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
        <button onClick={() => handleMatchCandidates(false)} className='match-button' disabled={loading}>
          {loading ? <CircularProgress thickness={6} size={20} sx={{ color: '#C3C3C3' }} /> : 'Match Candidates'}
        </button>
      </div>
      {showCandidates && <div className="match-result">Match Results: {candidates.filter(candidate => candidate.status != "Rejected").length} Candidate(s)</div>}
      {showCandidates &&
      <div style={{display: 'flex', flexWrap: 'wrap', gap: 16}}>
        {candidates
        .filter((candidate) => candidate.status != "Rejected")
        .map((candidate, index) => (
          <CandidateCard
            key={index}
            rank={index + 1}
            candidate={candidate}
            matchedJob={selectedJobTitle}
            company={company}
            location={location}
            handleViewDetails={() => handleViewDetails(candidate)}
            updateContact={updateContact}
            handleRejectCandidate={() => handleRejectCandidate(candidate)}
          />
        ))}
      </div>}
      <CandidateDetailsModal 
        open={viewDetails} 
        close={() => setViewDetails(false)}
        candidate={selectedCandidate}
        isEditable={false}
        handleMatchCandidates={handleMatchCandidates}
      />
    </div>
  );
};

export default MatchCandidatesPage;