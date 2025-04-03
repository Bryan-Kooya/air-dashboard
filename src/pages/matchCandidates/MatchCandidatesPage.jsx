import React, { useState, useEffect } from "react";
import "./MatchCandidatesPage.css"
import { useNavigate } from "react-router-dom";
import { db } from "../../firebaseConfig";
import { MenuItem, Select, Box, Chip, CircularProgress, Snackbar, Slide, Alert, Switch, Tooltip } from '@mui/material';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, query, where, orderBy, serverTimestamp, setDoc } from "firebase/firestore";
import CandidateCard from "../../components/candidateCard/CandidateCard";
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import { TooltipIcon } from "../../assets/images";
import { customJobMatchScore, translateToEnglish, translateToHebrew } from "../../utils/helper";
import { apiBaseUrl } from "../../utils/constants";

const MatchCandidatesPage = (props) => {
  const workSetupList = ['On-site', 'Hybrid', 'WFH'];
  const workShiftList = ['Regular shift', 'Mid shift', 'Night shift'];
  const salaryRanges = ["15,000 - 30,000", "31,000 - 50,000", "51,000 - 70,000", "71,000 - 90,000", "91,000 - 110,000", "120,000+"];
  const userId = props.userId;
  const userInfo = props.userInfo;
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]); // List of companies
  const [jobs, setJobs] = useState([]); // List of jobs
  const [selectedJob, setSelectedJob] = useState(''); // Currently selected job
  const [selectedJobTitle, setSelectedJobTitle] = useState('');
  const [jobLanguage, setJobLanguage] = useState('en');
  const [resumeLanguage, setResumeLanguage] = useState('en');
  const [jobLocation, setJobLocation] = useState('');
  const [company, setCompany] = useState('');
  const [tags, setTags] = useState([]);
  const [mandatoryTags, setMandatoryTags] = useState([]);
  const [requiredTags, setRequiredTags] = useState([]);
  const [jobTitleTags, setJobTitleTags] = useState('');
  const [jobTitleTag, setJobTitleTag] = useState('');
  const [enableTags, setEnableTags] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
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
  const [workSetup, setWorkSetup] = useState("");
  const [workShift, setWorkShift] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [industry, setIndustry] = useState("");
  const [filtersData, setFiltersData] = useState({
    tags: false,
    location: false,
    institution: false,
    industry: false,
    workSetup: "",
    workShift: "",
    salary: "",
  });

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
        const companies = [... new Set(jobData.map(job => job.company_name))];
        setJobs(jobData);
        setCompanies(companies);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    fetchJobs();
  }, []);

  useEffect(() => {
    // Disable matching if required fields are missing
    setDisabledMatching(!selectedJobTitle || !candidateCountInput || !company);
  }, [candidateCountInput, selectedJobTitle, company]);

  useEffect(() => {
    setCandidates([]);
    setShowCandidate(false);
    setTags([]);
    setMandatoryTags([]);
    // setJobTitleTags([]);
    setRequiredTags([]);
    // setJobTitleTag('');
    setEnableTags(false);
    setFiltersData((prev) => ({ ...prev, tags: false, location: false}));
    setSelectedJobTitle("");
    setCandidateCountInput(parseInt(1, 10));
  }, [company]);

  const handleFiltersChange = (e) => {
    const { name, type, checked, value } = e.target;
    setFiltersData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleJobSelect = async (jobId) => {
    setSelectedJob(jobId);
    try {
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      if (jobDoc.exists()) {
        const tagsData = jobDoc.data().tags;
        // const mandatoryTagsData = jobDoc.data().mandatory_tags;
        const jobTitle = jobDoc.data().job_title;
        const jobDescription = jobDoc.data().initialDescription;
        const language = jobDoc.data().language;
        const years = jobDoc.data().years;
        // Convert the comma-separated string into an array
        setTags(tagsData ? tagsData.split(',') : []);
        setMandatoryTags(jobDoc.data().mandatory_tags);
        setRequiredTags(jobDoc.data().required_tags || []);
        if (years) requiredTags.push(years);
        // setJobTitleTags(jobDoc.data().job_title_tags);
        // setJobTitleTag(jobDoc.data().jobTitleTag);
        setEnableTags(jobDoc.data().enableMandatory);
        setFiltersData((prev) => ({ ...prev, tags: jobDoc.data().enableMandatory, location: true}));
        setJobDescription(jobDescription);
        setGeneratedDescription(jobDoc.data().description)
        setSelectedJobTitle(jobTitle);
        setJobLanguage(language);
        setJobLocation(jobDoc.data().location);
        setCompany(jobDoc.data().company_name);
        setIndustry(jobDoc.data().industry);
      } else {
        console.error('No such document!');
        setTags([]);
        setMandatoryTags([]);
        // setJobTitleTags([]);
        setRequiredTags([]);
        // setJobTitleTag('');
        setEnableTags(false);
        setFiltersData((prev) => ({ ...prev, tags: false, location: false}));
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

  const areArraysEqual = (arr1, arr2) => {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((item, index) => item === arr2[index]);
  };

  const handleMatchCandidates = async (isRejected) => {
    console.log("Starting candidate matching process...");
    setLoading(true);
  
    try {
      const candidateCount = isRejected ? 1 : candidateCountInput || 1;
      const currentCandidateNames = new Set(candidates.map((candidate) => candidate.contact.name));
  
      // Validate candidate count
      if (candidateCount < 1 || candidateCount > 10) {
        updateMessage("Please enter a valid number between 1 and 10.", "warning", true);
        setLoading(false);
        return;
      }
  
      // Step 1: Translate tags and job title
      const translatedJobTitle = await translateToEnglish(selectedJobTitle);
      const translatedRequiredTagsEn = await Promise.all(requiredTags.map(translateToEnglish));
      const translatedRequiredTagsHe = await Promise.all(requiredTags.map(translateToHebrew));
      // const baseTags = enableTags
      //   ? [...translatedRequiredTagsEn, ...translatedRequiredTagsHe, selectedJobTitle, translatedJob]
      //   : [...mandatoryTags, selectedJobTitle, translatedJob];
      const baseJobTitleTags = [...translatedRequiredTagsEn, ...translatedRequiredTagsHe, selectedJobTitle, translatedJobTitle]
  
      // Generate updated tags with two-word combinations
      const jobTitleTags = generateUpdatedTags(baseJobTitleTags);
      const baseJobTags = enableTags ? [...mandatoryTags, ...requiredTags] : [...mandatoryTags];
      const jobTags =  Array.from(new Set(baseJobTags.map(tag => tag.toLowerCase())));
      
      // Step 2: Fetch all active contacts
      let allContacts = await fetchActiveContacts(userId);
  
      // Step 3: Filter out contacts already in candidates (if isRejected)
      if (isRejected) {
        allContacts = allContacts.filter((contact) => !currentCandidateNames.has(contact.name));
      }
  
      // Step 4: Filter out contacts with "Selected" or "Rejected" status for the specific job
      allContacts = filterContactsByJobStatus(allContacts, selectedJobTitle, company, jobTags);
  
      // Step 5: Prioritize contacts with skill_match score >= 85
      let prioritizedContacts = prioritizeContactsByScore(allContacts, company);
  
      // Step 6: Fetch additional contacts if needed
      if (prioritizedContacts.length < candidateCount || isRejected) {
        prioritizedContacts = await fetchAdditionalContacts(
          prioritizedContacts,
          candidateCount,
          jobTitleTags,
          jobTags,
          isRejected
        );
      }
  
      // Step 7: Process candidates
      await processCandidates(prioritizedContacts, candidateCount, isRejected, jobTitleTags, currentCandidateNames, jobTags);
  
      console.log("Candidate matching process complete.");
    } catch (error) {
      console.error("Error during candidate matching process:", error.message);
      updateMessage(`Error during candidate matching process: ${error.message}`, "error", true);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveContacts = async (userId) => {
    const contactsRef = collection(db, "contacts");
    const snapshot = await getDocs(query(contactsRef, where("userId", "==", userId), where("status", "==", "Active")));
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      ref: doc.ref,
    }));
  };

  const generateUpdatedTags = (baseTags) => {
    // Function to generate two-word tags from a given tag
    const generateTwoWordTags = (tag) => {
      // Split the tag by spaces or special characters
      const words = tag.split(/[\s\/\-_]+/);
  
      // If the tag has more than two words, generate two-word combinations
      if (words.length > 2) {
        const twoWordTags = [];
        for (let i = 0; i < words.length - 1; i++) {
          // Take two consecutive words and join them with a space
          const twoWordTag = `${words[i]} ${words[i + 1]}`;
          twoWordTags.push(twoWordTag.toLowerCase());
        }
        return twoWordTags;
      }
  
      // If the tag already has two or fewer words, return it as is
      return [tag.toLowerCase()];
    };
  
    // Generate updated tags by adding two-word tags to the baseTags
    let updatedTags = baseTags.flatMap((tag) => {
      // Keep the original tag
      const originalTag = tag.toLowerCase();
  
      // Generate two-word tags from the original tag
      const twoWordTags = generateTwoWordTags(tag);
  
      // Combine the original tag and the two-word tags
      return [originalTag, ...twoWordTags];
    });
  
    // Remove duplicates (if any)
    updatedTags = [...new Set(updatedTags)];
  
    return updatedTags;
  };

  const processCandidates = async (prioritizedContacts, candidateCount, isRejected, jobTitleTags, currentCandidateNames, jobTags) => {
    const contactsRef = collection(db, "contacts");
    const existingJobCandidates = [];
    const unprocessedContacts = [];
  
    // Separate existing job candidates from unprocessed contacts
    for (const contact of prioritizedContacts) {
      const job = contact.jobs?.find(
        (job) =>
          job.jobTitle === selectedJobTitle &&
          job.status === "Pending" &&
          job.company === company &&
          areArraysEqual(job.jobTags || [], jobTags)
      );
  
      if (job) {
        existingJobCandidates.push({
          contact: {
            name: contact.name,
            email: contact.email,
            phone: contact.phone,
            linkedin: contact.linkedin,
            location: contact.location,
            work_experience: contact.work_experience,
            certifications: contact.certifications,
            projects: contact.projects,
            education: contact.education,
            fileName: contact.fileName,
            url: contact.url,
          },
          language: contact.language,
          ...job,
        });
      } else {
        unprocessedContacts.push(contact);
      }
    }
  
    console.log(
      `Using ${existingJobCandidates.length} existing candidates and processing ${unprocessedContacts.length} new resumes.`
    );
  
    const processedCandidates = [];
    const processedContactIds = new Set();
  
    // Add existing candidates to the list
    if (existingJobCandidates.length > 0 && !isRejected) {
      setCandidates((prevCandidates) => {
        // Filter out duplicates from existingJobCandidates
        const uniqueNewCandidates = existingJobCandidates.filter(
          (candidate) => !currentCandidateNames.has(candidate.contact.name)
        );
  
        // Merge the unique candidates with the previous candidates
        const mergedCandidates = [...prevCandidates, ...uniqueNewCandidates];
  
        // Sort the merged candidates
        const sortedCandidates = mergedCandidates.sort(
          (a, b) => b.jobMatchScore?.tagScore.finalScore - a.jobMatchScore?.tagScore.finalScore
        );
  
        // Limit to candidateCount
        return sortedCandidates.slice(0, candidateCount);
      });
  
      setShowCandidate(true);
    }
  
    // Process new candidates
    while (processedCandidates.length < candidateCount && unprocessedContacts.length > 0) {
      const contact = unprocessedContacts.shift();
  
      try {
        const { resumeText, name, email, phone, linkedin, location, work_experience, certifications, projects, education, fileName, url, id, language } = contact;
  
        if (processedContactIds.has(id)) {
          console.log(`Skipping already processed contact: ${name}`);
          continue;
        }
  
        if (!resumeText) {
          throw new Error("Resume text is missing for contact: " + contact.name);
        }
  
        setResumeLanguage(language);
        setResumeData(resumeText);
  
        const res = await fetch(`${apiBaseUrl}/ai-match-resume`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resumeText, tags: jobTags, jobTitle: selectedJobTitle, language: jobLanguage }),
        });
  
        if (!res.ok) {
          const error = await res.json();
          console.error("Error processing resume:", error);
          throw new Error(error.error);
        }
  
        const processedCandidate = await res.json();
        console.log("Processed candidate data:", processedCandidate);
        // Custom job match scoring
        const jobMatchScore = await customJobMatchScore(contact, jobTitleTags, jobLocation, industry, filtersData, jobTags);
  
        await updateDoc(contact.ref, {
          jobs: arrayUnion({
            status: "Pending",
            ...processedCandidate,
            company,
            resumeText,
            jobTitle: selectedJobTitle,
            jobMatchScore,
            jobTags,
            jobDescription: jobDescription,
            generatedDescription,
            interviewPrep: [],
            language,
          }),
        });
  
        console.log(`Added job "${selectedJobTitle}" to contact: ${contact.name}`);
  
        processedContactIds.add(id);

        // Removed temporarily
        // if (jobMatchScore?.tagScore.finalScore >= 75) {
        if (processedCandidate.scores?.skill_match.score >= 65 || jobMatchScore?.tagScore.finalScore >= 65) {
          const newCandidate = {
            contact: { name, email, phone, linkedin, location, work_experience, certifications, projects, education, fileName, url },
            status: "Pending",
            ...processedCandidate,
            company,
            resumeText,
            jobTitle: selectedJobTitle,
            jobMatchScore,
            jobDescription: jobDescription,
            generatedDescription,
            interviewPrep: [],
            language,
          };
  
          processedCandidates.push(newCandidate);
  
          // Update the candidates state immediately
          setCandidates((prevCandidates) => {
            const mergedCandidates = isRejected ? [newCandidate] : [...prevCandidates, newCandidate];
            const sortedCandidates = mergedCandidates.sort(
              (a, b) => b.jobMatchScore?.tagScore.finalScore - a.jobMatchScore?.tagScore.finalScore
            );
            return sortedCandidates.slice(0, candidateCount); // Limit to candidateCount
          });
  
          setShowCandidate(true);
        } else {
          console.log(
            `Low job tag score (${jobMatchScore?.tagScore.finalScore}) for ${contact.name}. Fetching another resume...`
          );
  
          // Fetch additional contacts if the current one doesn't meet the score requirement
          const additionalQuery = query(
            contactsRef,
            where("userId", "==", userId),
            where("status", "==", "Active"),
            where("alternative_job_title_tags_en", "array-contains-any", jobTitleTags),
            orderBy("timestamp", "desc")
          );
  
          const additionalSnapshot = await getDocs(additionalQuery);
          let additionalContacts = additionalSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            ref: doc.ref,
          }));
  
          console.log("else additionalContacts", additionalContacts);
  
          // Filter out contacts with a high qualification score job or those already processed
          additionalContacts = additionalContacts.filter((contact) => {
            const hasRelevantJob = contact.jobs?.some((job) =>
              job.jobTitle === selectedJobTitle &&
              job.company === company &&
              areArraysEqual(job.jobTags || [], jobTags)
            );
            const isAlreadyProcessed = processedContactIds.has(contact.id);
            return !hasRelevantJob && !isAlreadyProcessed;
          });
  
          // Add the newly fetched contacts to the unprocessedContacts array
          unprocessedContacts.push(...additionalContacts);
          console.log(`Fetched ${additionalContacts.length} additional contacts.`);
        }
      } catch (error) {
        console.error(`Failed to process resume for contact: ${error.message}`);
      }
    }
  
    console.log(`Successfully processed and retrieved ${processedCandidates.length} candidates.`);
    setDisabledMatching(true);
  };
  
  const filterContactsByJobStatus = (contacts, jobTitle, company, tags) => {
    return contacts.filter((contact) => {
      const job = contact.jobs?.find((job) =>
        job.jobTitle === jobTitle &&
        job.company === company &&
        areArraysEqual(job.jobTags || [], tags) &&
        ['Selected', 'Rejected'].includes(job.status)
      );
      return !job;
    });
  };
  
  const prioritizeContactsByScore = (contacts, company) => {
    return contacts.filter((contact) => {
      // Removed temporarily
      // const job = contact.jobs?.find((job) => job?.jobMatchScore?.tagScore.finalScore >= 75 && job.company === company);
      const job = contact.jobs?.find((job) => (job?.scores?.skill_match.score >= 65 || job?.jobMatchScore?.tagScore.finalScore >= 65) && job.company === company);
      return Boolean(job);
    });
  };
  
  const fetchAdditionalContacts = async (prioritizedContacts, candidateCount, jobTitleTags, jobTags, isRejected) => {
    const contactsRef = collection(db, "contacts");
  
    // First, try with "job_title_tags"
    let additionalQuery = query(
      contactsRef,
      where("userId", "==", userId),
      where("status", "==", "Active"),
      where("job_title_tags", "array-contains-any", jobTitleTags),
      orderBy("timestamp", "desc")
    );
  
    let additionalSnapshot = await getDocs(additionalQuery);
    let additionalContacts = additionalSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      ref: doc.ref,
    }));
  
    // Filter out contacts that already have a relevant job
    additionalContacts = additionalContacts.filter((contact) => {
      const hasRelevantJob = contact.jobs?.some((job) =>
        job.jobTitle === selectedJobTitle &&
        job.company === company &&
        areArraysEqual(job.jobTags || [], jobTags)
      );
      return !hasRelevantJob;
    });
  
    // If still insufficient, try with "alternative_job_title_tags_en"
    if (additionalContacts.length < candidateCount - prioritizedContacts.length) {
      additionalQuery = query(
        contactsRef,
        where("userId", "==", userId),
        where("status", "==", "Active"),
        where("alternative_job_title_tags_en", "array-contains-any", jobTitleTags),
        orderBy("timestamp", "desc")
      );
  
      additionalSnapshot = await getDocs(additionalQuery);
      const alternativeContacts = additionalSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        ref: doc.ref,
      }));
  
      // Filter out contacts that already have a relevant job
      const filteredAlternativeContacts = alternativeContacts.filter((contact) => {
        const hasRelevantJob = contact.jobs?.some((job) =>
          job.jobTitle === selectedJobTitle &&
          job.company === company &&
          areArraysEqual(job.jobTags || [], jobTags)
        );
        return !hasRelevantJob;
      });
  
      // Add the alternative contacts to the additionalContacts array
      additionalContacts = [...additionalContacts, ...filteredAlternativeContacts];
    }
  
    // Limit the number of additional contacts to the required count
    additionalContacts = additionalContacts.slice(0, isRejected ? 1 : candidateCount - prioritizedContacts.length);
  
    // Add the additional contacts to the prioritizedContacts array
    return [...prioritizedContacts, ...additionalContacts];
  };
        
  const updateContact = async (candidate, status, interviewPrep) => {
    console.log('Candidate:', candidate, status, interviewPrep);
    try {  
      const contactsRef = collection(db, "contacts");
  
      // Check if the contact with the same name already exists
      const querySnapshot = await getDocs(
        query(
          contactsRef, 
          where("name", "==", candidate.contact.name),
          where("userId", "==", userId)
        )
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
      const jobIndex = existingJobs.findIndex((job) => job.jobTitle === selectedJobTitle && job.company === company);
  
      if (jobIndex >= 0) {
        // If the job exists, update its status
        existingJobs[jobIndex].interviewPrep = interviewPrep;
        existingJobs[jobIndex].status = status;
        existingJobs[jobIndex].jobDescription = jobDescription;
      } else {
        // Add the new job if it doesn't exist
        existingJobs.push({ jobTitle: selectedJobTitle, status: status, interviewPrep, jobDescription, generatedDescription });
      }
  
      // Update the contact's document with the updated jobs field
      await updateDoc(contactDocRef, {
        jobs: existingJobs,
      });

      // Update the local candidates state
      setCandidates((prevCandidates) =>
        prevCandidates.map((c) =>
          c.contact.name === candidate.contact.name
            ? { ...c, status, interviewPrep, jobDescription, generatedDescription, resumeText: resumeData, language: resumeLanguage } // Update the status and interviewPrep of the matched candidate
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
        location: jobLocation,
        searchKeywords,
        jobId: selectedJob,
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

  const matchingCandidates = async () => {
    await handleMatchCandidates(false);
  };

  (function setHeaderTitle() {
    props.title("Match Candidates");
    props.subtitle("Highlights candidates filtered by criteria and ranks them based on their alignment with job’s requirements");
  })();

  return (
    <div className="match-candidates-container">
      <div className="card">
        <div className="input-row">
          <div style={{width: 360}} className="card-row">
            <div className="card-title">Company:</div>
            <Select
              id="select-input"
              displayEmpty
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              renderValue={() =>
                company ? company : "Select Company"
              }
            >
              {companies
                .map((company, index) => (
                  <MenuItem id="options" key={index} value={company}>
                    {company}
                  </MenuItem>
                ))}
            </Select>
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
                .filter((job) => job.status !== "Not Active" && job.company_name === company) // Exclude jobs with 'Not Active' status
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
              value={candidateCountInput}
              onInput={(e) => {
                // Ensure the input stays within range
                if (e.target.value > 10) e.target.value = 10;
                if (e.target.value < 1) e.target.value = 1;
                // Update state with the value of the input
                setCandidateCountInput(parseInt(e.target.value, 10));
              }}
            />
            <button 
              style={{marginTop: 'auto'}}
              onClick={matchingCandidates} 
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
          <div className="card-row">
            <div className="card-title">Filters: <span className="sub-label">Applying the filters below will adjust which candidates are visible and influence their matching scores.</span>
            </div>
            <div className='insight-card-container'>
              <div className='filter-card' style={{width: '100%'}}>
                <div className='insight-card-container'>
                  <div className='score-row' style={{width: '100%'}}>
                    <Switch 
                      checked={enableTags} 
                      name="tags"
                      size="small"
                      value={filtersData.tags}
                      onChange={(e) => {setEnableTags(e.target.checked); handleFiltersChange(e)}}
                    /> Mandatory Tags
                  </div>
                  <div className='score-row' style={{width: '100%'}}>
                    <Switch 
                      checked={filtersData.location}
                      size="small"
                      name="location" 
                      value={filtersData.location}
                      onChange={(e) => handleFiltersChange(e)}
                    /> Place of living
                  </div>
                </div>
                <div className='insight-card-container'>
                  <div className='score-row' style={{width: '100%'}}>
                    <Switch 
                      checked={filtersData.industry}
                      size="small"
                      name="industry"
                      value={filtersData.industry}
                      onChange={(e) => handleFiltersChange(e)}
                    /> Industry
                  </div>
                  <div className='score-row' style={{width: '100%'}}>
                    <Switch 
                      checked={filtersData.institution}
                      size="small"
                      name="institution" 
                      value={filtersData.institution}
                      onChange={(e) => handleFiltersChange(e)}
                    /> University
                  </div>
                </div>
              </div>
              <div className='filter-card' style={{width: '100%'}}>
                <div className='score-row'>
                  <div style={{whiteSpace: 'nowrap'}}>Work setup:&nbsp;&nbsp;</div>
                  <Select
                    id="select-input-small"
                    sx={{width: '100%'}}
                    displayEmpty
                    name="workSetup"
                    value={filtersData.workSetup}
                    onChange={(e) => handleFiltersChange(e)}
                    renderValue={() =>
                      filtersData.workSetup ? filtersData.workSetup : "Select setup"
                    }
                  >
                    {workSetupList
                      .map((work, index) => (
                        <MenuItem id="options" key={index} value={work}>
                          {work}
                        </MenuItem>
                      ))}
                  </Select>
                </div>
                <div className='score-row'>
                  <div style={{whiteSpace: 'nowrap'}}>Work shift:&nbsp;&nbsp;&nbsp;&nbsp;</div>
                  <Select
                    id="select-input-small"
                    sx={{width: '100%'}}
                    displayEmpty
                    name="workShift"
                    value={filtersData.workShift}
                    onChange={(e) => handleFiltersChange(e)}
                    renderValue={() =>
                      filtersData.workShift ? filtersData.workShift : "Select shift"
                    }
                  >
                    {workShiftList
                      .map((work, index) => (
                        <MenuItem id="options" key={index} value={work}>
                          {work}
                        </MenuItem>
                      ))}
                  </Select>
                </div>
                <div className='score-row'>
                  <div style={{whiteSpace: 'nowrap'}}>Salary range:</div>
                  <Select
                    id="select-input-small"
                    sx={{width: '100%'}}
                    displayEmpty
                    name="salary"
                    value={filtersData.salary}
                    onChange={(e) => handleFiltersChange(e)}
                    renderValue={() =>
                      filtersData.salary ? filtersData.salary : "Select setup"
                    }
                  >
                    {salaryRanges
                      .map((range, index) => (
                        <MenuItem id="options" key={index} value={range}>
                          {range}
                        </MenuItem>
                      ))}
                  </Select>
                </div>
              </div>
            </div>
            <div className='insight-card-container'>
              <div className="card-row" style={{flex: 1/3}}>
                <div className="card-title">Mandatory Tags:</div>
                <div className='filter-card'>
                  <Box>
                    {requiredTags.map((tag, index) => (
                      <Chip
                        id='tags'
                        key={index}
                        label={tag}
                        // onDelete={() => handleDeleteTag(tag)}
                      />
                    ))}
                  </Box>
                </div>
              </div>
              <div className="card-row" style={{flex: 2/3}}>
                <div className="card-title">Tags:</div>
                <div className='filter-card'>
                  <Box>
                    {mandatoryTags.map((tag, index) => (
                      <Chip
                        id='tags'
                        key={index}
                        label={tag}
                        // onDelete={() => handleDeleteTag(tag)}
                      />
                    ))}
                  </Box>
                </div>
              </div>
            </div>
          </div>
        </div>
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