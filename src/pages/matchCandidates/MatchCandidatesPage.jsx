import React, { useState, useEffect } from "react";
import "./MatchCandidatesPage.css"
import { useNavigate } from "react-router-dom";
import { db } from "../../firebaseConfig";
import { MenuItem, Select, Box, Chip, CircularProgress, Snackbar, Slide, Alert } from '@mui/material';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, query, where, orderBy, serverTimestamp, setDoc } from "firebase/firestore";
import CandidateCard from "../../components/candidateCard/CandidateCard";
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import { capitalizeFirstLetter } from "../../utils/utils";
import { translateToEnglish } from "../../utils/helper";
import { apiBaseUrl } from "../../utils/constants";

const MatchCandidatesPage = (props) => {
  const userId = props.userId;
  const userInfo = props.userInfo;
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]); // List of jobs
  const [selectedJob, setSelectedJob] = useState(''); // Currently selected job
  const [selectedJobTitle, setSelectedJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [company, setCompany] = useState('');
  const [tags, setTags] = useState([]); // Tags related to the selected job
  const [jobDescription, setJobDescription] = useState('');
  const [inputTag, setInputTag] = useState(''); // Input for new tags
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCandidates, setShowCandidate] = useState(false);
  const [viewDetails, setViewDetails] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState([]);
  const [candidateCountInput, setCandidateCountInput] = useState(null);
  const [disabledMatching, setDisabledMatching] = useState(false);
  const [resumeData, setResumeData] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [messageType, setMessageType] = useState("");
  const [candidateId, setCandidateId] = useState("");

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobsCollection = collection(db, 'jobs');
        let q = query(
          jobsCollection, 
          where("userId", "==", userId), 
          orderBy("timestamp"),   
        );
        const jobSnapshot = await getDocs(q);
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

  useEffect(() => {
    setDisabledMatching(!selectedJobTitle || !candidateCountInput);
  }, [candidateCountInput, selectedJobTitle]);

  const handleJobSelect = async (jobId) => {
    setSelectedJob(jobId);
    try {
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      if (jobDoc.exists()) {
        const tagsData = jobDoc.data().tags;
        const jobTitle = jobDoc.data().job_title;
        const jobDescription = jobDoc.data().initialDescription;
        // Convert the comma-separated string into an array
        setTags(tagsData ? tagsData.split(',') : []);
        setJobDescription(jobDescription);
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
    if (!isRejected) {
      setCandidates([]);
      setShowCandidate(false);
    }
    setLoading(true);
  
    try {
      // Determine the number of candidates to process
      const candidateCount = isRejected ? 1 : candidateCountInput || 1;
      const translatedJob = await translateToEnglish(selectedJobTitle);

      let updatedTags = [...tags, ...translatedJob.split(" "), translatedJob];
      // Translate updatedTags to English
      const translatedTags = await Promise.all(updatedTags.map(async (tag) => {
        return await translateToEnglish(tag);
      }));

      console.log('translatedTags', translatedTags);
  
      if (candidateCount < 1 || candidateCount > 10) {
        updateMessage("Please enter a valid number between 1 and 10.", "warning", true);
        setLoading(false);
        return;
      }
  
      console.log(`Fetching ${isRejected ? "next" : `up to ${candidateCount}`} contacts...`);
  
      const contactsRef = collection(db, "contacts");
      const allContactsSnapshot = await getDocs(query(contactsRef, where("userId", "==", userId)));
      let allContacts = allContactsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        ref: doc.ref,
      }));
  
      // Step 1: Filter out contacts already in candidates if isRejected is true
      if (isRejected) {
        const currentCandidateNames = new Set(candidates.map((candidate) => candidate.contact.name));
        allContacts = allContacts.filter((contact) => !currentCandidateNames.has(contact.name));
        console.log("Rejected is true: ", allContacts);
      }

      // Step 2: Filter out contacts with "Selected" or "Rejected" status for the specific job title
      allContacts = allContacts.filter((contact) => {
        const job = contact.jobs?.find((job) => job.jobTitle === selectedJobTitle);
        return !job || (job.status !== "Selected" && job.status !== "Rejected");
      });
  
      console.log(`Filtered contacts count after removing "Selected" or "Rejected": ${allContacts.length}`);
  
      // Step 3: Filter contacts with the specific condition
      let prioritizedContacts = allContacts.filter((contact) => {
        const job = contact.jobs?.find(
          (job) =>
            job.jobTitle === selectedJobTitle &&
            job.status === "Pending" &&
            job.scores?.job_title_relevance.score >= 85
        );
        return Boolean(job);
      });
  
      console.log(`Prioritized contacts count: ${prioritizedContacts.length}`);
  
      // Step 4: If insufficient, add new available contacts with tags matching the selected job tags
      if (prioritizedContacts.length < candidateCount || isRejected) {
        const additionalQuery = query(
          contactsRef,
          where("userId", "==", userId),
          where("tags", ">=", translatedTags), // Use translated tags
          orderBy("timestamp", "desc") // Sort by timestamp
        );
      
        const additionalSnapshot = await getDocs(additionalQuery);
      
        const additionalContacts = additionalSnapshot.docs
          .filter((doc) => {
            const contactData = doc.data();
      
            // Check if there's no job entry for the selected job title
            const hasRelevantJob = contactData.jobs?.some((job) => job.jobTitle === selectedJobTitle);
      
            // Exclude candidates with matching job title and unwanted statuses
            return !hasRelevantJob;
          })
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
            ref: doc.ref,
          }))
          .slice(0, isRejected ? 1 : candidateCount - prioritizedContacts.length); // Apply the limit after filtering
      
        // Add new contacts to the prioritized list
        prioritizedContacts = [...prioritizedContacts, ...additionalContacts];
        console.log(`Added new contacts, total prioritized count: ${prioritizedContacts.length}`);
      }      
  
      if (prioritizedContacts.length === 0) {
        console.log(`No eligible contacts found for the ${selectedJobTitle} job`);
        setShowCandidate(true);
        updateMessage(`No eligible contacts found for the ${selectedJobTitle} job`, "warning", true)
        setLoading(false);
        return;
      }
  
      // Separate contacts into existing candidates and new ones for processing
      const existingJobCandidates = [];
      const unprocessedContacts = [];
  
      for (const contact of prioritizedContacts) {
        const job = contact.jobs?.find(
          (job) =>
            job.jobTitle === selectedJobTitle &&
            job.status === "Pending" &&
            job.scores?.job_title_relevance.score >= 85
        );
  
        if (job) {
          existingJobCandidates.push({
            contact: {
              name: contact.name,
              email: contact.email,
              phone: contact.phone,
              linkedin: contact.linkedin,
              location: contact.location,
              fileName: contact.fileName,
              url: contact.url,
            },
            ...job,
          });
        } else {
          unprocessedContacts.push(contact);
        }
      }
  
      console.log(
        `Using ${existingJobCandidates.length} existing candidates and processing ${unprocessedContacts.length} new resumes.`
      );
  
      // Process unprocessed contacts
      const processedCandidates = [];
      const processedContactIds = new Set(); // Track processed contact IDs to avoid duplication

      // Use a while loop to continue fetching and processing until we have enough candidates
      while (processedCandidates.length < candidateCount && unprocessedContacts.length > 0) {
        const contact = unprocessedContacts.shift(); // Take the first contact from the queue

        try {
          const { resumeText, name, email, phone, linkedin, location, fileName, url, id } = contact;

          if (processedContactIds.has(id)) {
            console.log(`Skipping already processed contact: ${name}`);
            continue; // Skip if already processed
          }

          if (!resumeText) {
            throw new Error("Resume text is missing for contact: " + contact.name);
          }
          setResumeData(resumeText);

          // Call external API to process the resume
          const res = await fetch(`${apiBaseUrl}/match-resume`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ resumeText, tags: updatedTags, jobTitle: selectedJobTitle }),
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
              status: "Pending",
              ...processedCandidate,
              company,
              resumeText,
              jobTitle: selectedJobTitle,
              jobDescription: jobDescription,
              interviewPrep: [],
            }),
          });

          console.log(`Added job "${selectedJobTitle}" to contact: ${contact.name}`);

          // Mark the contact as processed immediately
          processedContactIds.add(id);

          // Only add the candidate if their scores.job_title_relevance.score >= 85
          if (processedCandidate.scores?.job_title_relevance.score >= 85) {
            processedCandidates.push({
              contact: { name, email, phone, linkedin, location, fileName, url },
              status: "Pending",
              ...processedCandidate,
              company,
              resumeText,
              jobTitle: selectedJobTitle,
              jobDescription: jobDescription,
              interviewPrep: [],
            });
          } else {
            console.log(`Low skill match score (${processedCandidate.scores?.job_title_relevance.score}) for ${contact.name}. Fetching another resume...`);

            // Fetch another contact, excluding already processed contacts
            const additionalQuery = query(
              contactsRef,
              where("userId", "==", userId),
              where("tags", ">=", translatedTags),
              orderBy("timestamp", "desc")
            );
            const additionalSnapshot = await getDocs(additionalQuery);

            const additionalContacts = additionalSnapshot.docs
              .filter((doc) => {
                const contactData = doc.data();
                const hasRelevantJob = contactData.jobs?.some((job) => job.jobTitle === selectedJobTitle);
                const isAlreadyProcessed = processedContactIds.has(doc.id);
                return !hasRelevantJob && !isAlreadyProcessed; // Exclude already processed contacts
              })
              .map((doc) => ({
                id: doc.id,
                ...doc.data(),
                ref: doc.ref,
              }));

            // Add the new contacts to the processing queue
            unprocessedContacts.push(...additionalContacts);
          }
        } catch (error) {
          console.error(`Failed to process resume for contact: ${error.message}`);
        }
      }

      // Combine existing and processed candidates
      const allCandidates = [...existingJobCandidates, ...processedCandidates];

      console.log(`Successfully processed and retrieved ${allCandidates.length} candidates.`);
      setCandidates((prevCandidates) => {
        const mergedCandidates = isRejected ? [...prevCandidates, ...allCandidates] : allCandidates;
        // Sort the candidates by skill match score in descending order
        const sortedCandidates = mergedCandidates.sort((a, b) => b.scores?.job_title_relevance.score - a.scores?.job_title_relevance.score);
        return sortedCandidates;
      });
      setShowCandidate(true);
      setDisabledMatching(true);
    } catch (error) {
      console.error("Error during candidate matching process:", error.message);
      setDisabledMatching(true);
    } finally {
      setLoading(false);
      console.log("Candidate matching process complete.");
    }
  };
        
  const updateContact = async (candidate, status, interviewPrep) => {
    console.log('Candidate:', candidate, status, interviewPrep);
    try {  
      const contactsRef = collection(db, "contacts");
  
      // Check if the contact with the same name already exists
      const querySnapshot = await getDocs(
        query(contactsRef, where("name", "==", candidate.contact.name))
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
        existingJobs[jobIndex].interviewPrep = interviewPrep;
        existingJobs[jobIndex].status = status;
        existingJobs[jobIndex].jobDescription = jobDescription;
      } else {
        // Add the new job if it doesn't exist
        existingJobs.push({ jobTitle: selectedJobTitle, status: status, interviewPrep, jobDescription });
      }
  
      // Update the contact's document with the updated jobs field
      await updateDoc(contactDocRef, {
        jobs: existingJobs,
      });

      // Update the local candidates state
      setCandidates((prevCandidates) =>
        prevCandidates.map((c) =>
          c.contact.name === candidate.contact.name
            ? { ...c, status, interviewPrep, jobDescription, resumeText: resumeData } // Update the status and interviewPrep of the matched candidate
            : c // Leave other candidates unchanged
        )
      );
  
      console.log("Candidate's job information updated successfully!");
    } catch (error) {
      console.error("Error updating candidate's job information:", error);
    }
  };

  const handleRejectCandidate = async (candidate) => {
    await updateContact(candidate, "Rejected", candidate.interviewPrep || []);
    updateMessage(`Candidate successfully rejected for ${selectedJobTitle} job.`, "success", true);
    handleMatchCandidates(true);
  };

  const handleViewDetails = (candidate) => {
    setCandidateId(candidate.id);
    setSelectedCandidate(candidate);
    setViewDetails(true);
  }

  const handleSaveCandidate = async (candidate) => {
    try {
      if (!candidate?.contact?.name || !selectedJobTitle) {
        updateMessage("Candidate name or job is missing. Unable to save.", "warning", true);
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
        selectedJobTitle?.toLowerCase() || "",
      ].filter(Boolean); // Remove empty values

      const candidateData = {
        ...updatedCandidate,
        userId: userId,
        company: company,
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
          where("job", "==", selectedJobTitle)
        )
      );
  
      if (!querySnapshot.empty) {
        // If a candidate with the same name and job exists, skip saving
        updateMessage("Candidate with the same name and job already exists.", "info", true);
        return;
      }
  
      const newCandidateRef = doc(candidatesRef); // Automatically generates a unique ID
      await setDoc(newCandidateRef, candidateData);
      await updateContact(candidate, "Selected", candidate.interviewPrep);

      // Update the local state to reflect the change
      // setCandidate(updatedCandidate);

      updateMessage(`Candidate selected for ${selectedJobTitle} job. Saved successfully!`, "success", true);
    } catch (error) {
      console.error("Error saving candidate:", error);
      updateMessage("An error occurred while saving the candidate.", "error", true);
    }
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const updateMessage = (value, type, isOpen) => {
    setMessage(value);
    setMessageType(type);
    if (isOpen && !open) {
      setOpen(true); // Only set open to true if it's not already open
    }
  };

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
                // Update state with the value of the input
                setCandidateCountInput(parseInt(e.target.value, 10) || null);
              }}
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
        <button 
          onClick={() => handleMatchCandidates(false)} 
          className='match-button' 
          disabled={loading || disabledMatching}
        >
          {loading ? (
            <>
              <CircularProgress thickness={6} size={20} sx={{ color: '#C3C3C3', marginRight: '8px' }} />
              Matching Candidates...
            </>
          ) : (
            'Match Candidates'
          )}
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
            handleViewDetails={() => handleViewDetails(candidate)}
            handleRejectCandidate={() => handleRejectCandidate(candidate)}
            saveCandidate={handleSaveCandidate}
          />
        ))}
      </div>}
      <CandidateDetailsModal 
        candidateId={candidateId}
        open={viewDetails} 
        close={() => setViewDetails(false)}
        candidate={selectedCandidate}
        isEditable={false}
        userInfo={userInfo}
        updateContact={updateContact}
        saveCandidate={handleSaveCandidate}
        handleRejectCandidate={() => handleRejectCandidate(selectedCandidate)}
        updateMessage={updateMessage}
      />
      <Snackbar
        autoHideDuration={5000}
        open={open}
        onClose={handleClose}
        TransitionComponent={Slide} // Use Slide transition
        TransitionProps={{ direction: "up" }} // Specify the slide direction
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }} // Position the Snackbar
      >
        <Alert sx={{alignItems: 'center', "& .MuiAlert-action": {padding: '0px 0px 0px 6px'}, "& .MuiButtonBase-root": {width: '36px'}}} onClose={handleClose} severity={messageType}>
          {message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default MatchCandidatesPage;