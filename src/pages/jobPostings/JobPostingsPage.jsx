import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import "./JobPostingsPage.css"
import { useNavigate } from "react-router-dom";
import { db } from "../../firebaseConfig";
import { Select, MenuItem, CircularProgress, Snackbar, Slide, Alert, Tooltip } from '@mui/material';
import AIGeneratedJobModal from "../../components/aiGeneratedJobModal/AIGeneratedJobModal";
import EditJobModal from "../../components/editJobModal/EditJobModal";
import { apiBaseUrl } from "../../utils/constants";
import { fetchPaginatedJobs, searchJobs } from "../../utils/firebaseService";
import { SearchIcon, EditIcon, Delete } from "../../assets/images";
import ConfirmModal from "../../components/confirmModal/ConfirmModal";
import CircularLoading from "../../components/circularLoading/CircularLoading";

const JobPostingsPage = (props) => {
  const tableHeader = ["Job Title", "Status", "Company", "Industry", "Location", "Actions"];
  const statusList = ["Active", "Not Active"];
  const sortOptions = ["Newest", "Oldest"];
  const userId = props.userId;
  const [sortedBy, setSortedBy] = useState("");
  const [jobs, setJobs] = useState([]);
  const [job, setJob] = useState([]);
  const [formData, setFormData] = useState({
    job_title: '',
    status: '',
    company_name: '',
    industry: '',
    location: '',
    description: '',
  });
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isGenerateModalOpen, setAIGenerateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [loadingJobId, setLoadingJobId] = useState(null); // Tracks the job currently being updated
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDocs, setLastVisibleDocs] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [messageType, setMessageType] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [jobId, setJobId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const observer = useRef();
  const pageSize = 5;

  const lastJobElementRef = useCallback(node => {
    if (loadingMessages) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreJobs();
      }
    }, { threshold: 0.5 });

    if (node) observer.current.observe(node);
  }, [loadingMessages, hasMore]);

  const loadJobs = async () => {
    try {
      const { data, lastVisible: last, total } = await fetchPaginatedJobs(pageSize, null, userId);
      setJobs(data);
      setLastVisible(last);
      setHasMore(data.length < total);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      updateMessage("Error loading jobs", "error", true);
    }
  };

  const loadMoreJobs = async () => {
    if (!hasMore || loadingMessages) return;
    
    setLoadingMessages(true);
    try {
      const { data, lastVisible: last, total } = await fetchPaginatedJobs(
        pageSize,
        lastVisible,
        userId
      );
      
      if (data.length > 0) {
        setJobs([...jobs, ...data]);
        setLastVisible(last);
        setHasMore(jobs.length + data.length < total);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more jobs:", error);
      updateMessage("Error loading more jobs", "error", true);
    } finally {
      setLoadingMessages(false);
    }
  };

  const searchAndLoadJobs = async () => {
    if (!searchQuery) {
      setJobs([]);
      setLastVisible(null);
      setHasMore(true);
      await loadJobs();
      return;
    }
    try {
      setLoadingMessages(true);
      const data = await searchJobs(searchQuery, userId);
      setJobs(data);
      setHasMore(false);
    } catch (error) {
      console.error("Error searching jobs:", error);
      updateMessage("Error searching jobs", "error", true);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Update a job
  const updateJob = async (updatedJob) => {
    try {
      setLoading(true);
      setError(null);
      const jobDoc = doc(db, "jobs", updatedJob.id);
      console.log('Updating job data:', updatedJob);
      await updateDoc(jobDoc, updatedJob);
      setJobs(jobs.map((job) => (job.id === updatedJob.id ? { ...job, ...updatedJob } : job)));
      // Show success message
      setError(null);
      setEditModalOpen(false);
    } catch (error) {
      console.error("Error updating job:", error);
    } finally {
      setLoading(false);
    }
  };

  // Delete a job
  const deleteJob = async (id) => {
    setConfirming(true);
    try {
      const jobDoc = doc(db, "jobs", id);
      await deleteDoc(jobDoc);
      setTimeout(() => setConfirming(false), 500);
      setShowConfirm(false);
      updateMessage("Job deleted successfully!", "success", true);
      setJobs(jobs.filter((job) => job.id !== id));
    } catch (error) {
      setTimeout(() => setConfirming(false), 500);
      setShowConfirm(false);
      console.error("Error deleting job:", error);
      updateMessage("An error occurred while deleting job", "error", true);
    }
  };

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await searchAndLoadJobs();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setJob((prev) => ({ ...prev, [name]: value }));
  };

  const handleAICreateJob = async () => {
    // e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Submitting form data:', formData);
      const response = await fetch(`${apiBaseUrl}/generate-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('Response status:', response.status);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate description');
      }

      console.log('Generated description:', data);
      setGeneratedDescription(data.description);
      setAIGenerateModalOpen(true);
      
      // Parse and set tags
      const tagsData = JSON.parse(data.tags);
      setTags(tagsData.tags || []);
      setLanguage(data.language);

    } catch (error) {
      console.error('Error:', error);
      setError(error.message || 'Failed to generate description');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);

      const jobData = {
        job_title: formData.job_title,
        status: "Active",
        company_name: formData.company_name,
        industry: formData.industry,
        location: formData.location,
        initialDescription: formData.description,
        description: generatedDescription,
        tags: tags.join(','),
        language,
        userId: userId,
        timestamp: serverTimestamp(),
      };

      console.log('Saving job data:', jobData);

      // Save to Firebase
      const docRef = await addDoc(collection(db, "jobs"), jobData);
      setJobs([...jobs, { id: docRef.id, ...jobData }]);
      console.log("Job saved successfully with ID:", docRef.id);
      updateMessage("Job saved successfully!", "success", true);
      
      // Reset form after successful save
      setFormData({
        job_title: '',
        status: '',
        company_name: '',
        industry: '',
        location: '',
        description: '',
      });
      setGeneratedDescription('');
      setAIGenerateModalOpen(false);
      setTags([]);
      setLanguage('en');
      
      // Show success message
      setError(null);
    } catch (error) {
      console.error('Error saving job:', error);
      setError(error.message || 'Failed to save job');
    } finally {
      setLoading(false);
    }
  };

  const handleEditJob = (id) => {
    setEditModalOpen(true);
    const selectedJob = jobs.find(job => job.id === id);
    setJob(selectedJob);
  };

  const handleSortedBy = (sortOption) => {
    setSortedBy(sortOption);
  
    const sortedJobs = [...jobs].sort((a, b) => {
      const dateA = a.timestamp;
      const dateB = b.timestamp;
  
      if (sortOption === "Newest") {
        return dateB - dateA; // Sort by descending date
      }
      if (sortOption === "Oldest") {
        return dateA - dateB; // Sort by ascending date
      }
      return 0;
    });
  
    setJobs(sortedJobs);
  };

  const handleJobStatus = async (jobId, newStatus) => {
    try {
      setLoadingJobId(jobId);
      // Find the job to update
      const jobDoc = doc(db, "jobs", jobId);
      console.log(`Updating status of job ID: ${jobId} to ${newStatus}`);
      await updateDoc(jobDoc, { status: newStatus });
      setJobs((prevJobs) =>
        prevJobs.map((job) =>
          job.id === jobId ? { ...job, status: newStatus } : job
        )
      );
      updateMessage("Job status updated successfully!", "success", true);
    } catch (error) {
      updateMessage("An error occurred while updating job status.", "error", true);
      console.error("Error updating job status:", error);
    } finally {
      setLoadingJobId(null); // Reset the loading state
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

  const handleDeleteJob = (id) => {
    setJobId(id);
    setShowConfirm(true);
  };

  // Watch for changes in searchQuery
  useEffect(() => {
    if (searchQuery === "" || searchQuery.length >= 3) {
      handleSearchSubmit({ preventDefault: () => {} }); // Simulate form submission
    }
  }, [searchQuery]);

  (function setHeaderTitle () {
    props.title("Job Definitions");
    props.subtitle("Centralized page to add new jobs and manage all existing ones.");
  })();

  return (
    <div className="job-postings-container">
      <div className="add-job card">
        <div className="card-title">Add a New Job</div>
        <div className="input-row">
          <div className="card-row">
            <div className="row-title">Job Title:</div>
            <input 
              required // Add required attribute
              placeholder="Enter job title"
              className={`job-info-input ${!formData.job_title ? 'required-field' : ''}`} // Add class for visual feedback
              name="job_title"
              value={formData.job_title}
              onChange={handleInputChange}
            />
          </div>
          <div className="card-row">
            <div className="row-title">Company Name:</div>
            <input 
              required // Add required attribute
              placeholder="Enter company name"
              className={`job-info-input ${!formData.company_name ? 'required-field' : ''}`} // Add class for visual feedback
              name="company_name"
              value={formData.company_name}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="card-row">
            <div className="row-title">Company Industry:</div>
            <input 
              placeholder="Enter company industry"
              className="job-info-input"
              name="industry"
              value={formData.industry}
              onChange={handleInputChange}
            />
          </div>
          <div className="card-row">
            <div className="row-title">Company location:</div>
            <input 
              placeholder="Enter company location"
              className="job-info-input"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
            />
          </div>
        </div>
        <div className="card-row">
          <div className="row-title">Initial Job Description:</div>
          <textarea
            className="job-description"
            placeholder="Enter initial job description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
          />
        </div>
        <button 
          disabled={loading || !formData.job_title || !formData.company_name} // Disable if fields are empty
          onClick={handleAICreateJob} 
          className="add-job-button"
        >
          {loading && <CircularProgress thickness={6} size={20} sx={{ color: '#C3C3C3' }} />}
          {`${loading ? 'Generating...' : 'AI Create Job'}`}
        </button>
      </div>
      <AIGeneratedJobModal
        open={isGenerateModalOpen}
        onClose={() => setAIGenerateModalOpen(false)}
        generatedDescription={generatedDescription}
        tags={tags}
        handleSave={handleSave}
        loading={loading}
      />
      <EditJobModal 
        open={isEditModalOpen}
        close={() => setEditModalOpen(false)}
        job={job}
        handleEditInputChange={handleEditInputChange}
        updateJob={updateJob}
        loading={loading}
      />
      <div className="jobs card">
        <div className="title-container">
          <div className="card-title">Recently Added Jobs</div>
          <div className="flex">
            <Select 
              id="select-input" 
              sx={{width: 100}}
              displayEmpty
              value={sortedBy} 
              onChange={(e) => handleSortedBy(e.target.value)}
              renderValue={() => sortedBy ? sortedBy : "Sort by"}
            >
              {sortOptions.map((option, index) => (
                <MenuItem id="options" key={index} value={option} onChange={() => handleSortedBy(option)}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            <form className="search-container" onSubmit={handleSearchSubmit}>
              <div className="search-wrapper">
                <img onClick={handleSearchSubmit} src={SearchIcon} alt="Search Icon" className="search-icon" />
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="search primary-button" type="submit">Search</button>
            </form>
          </div>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              {tableHeader.map(header => (
                <th>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.length > 0 ?
            jobs.map((job, index) => (
              <tr key={job.id} ref={index === jobs.length - 1 ? lastJobElementRef : null}>
                <td>{job.job_title}</td>
                <td>
                  {loadingJobId === job.id ? 
                  <CircularLoading color={"#02B64A"}/> : 
                  (<Select
                    id="select-input"
                    sx={{ width: 140 }}
                    displayEmpty
                    value={job.status}
                    onChange={(e) => handleJobStatus(job.id, e.target.value)}
                  >
                    {statusList.map((status, index) => (
                      <MenuItem key={index} value={status}>
                        <div className="status-container">
                          <div className={`status-badge ${status?.toLowerCase().replace(/\s/g, "-")}`}></div>
                          {status}
                        </div>
                      </MenuItem>
                    ))}
                  </Select>)}
                </td>
                <td>{job.company_name}</td>
                <td>{job.industry}</td>
                <td>{job.location}</td>
                <td>
                  <Tooltip title="Edit">
                    <img style={{marginRight: 20}} onClick={() => handleEditJob(job.id)} src={EditIcon} alt="Edit" />
                  </Tooltip>
                  <Tooltip title="Delete">
                    <img onClick={() => handleDeleteJob(job.id)} src={Delete} alt="Delete" />
                  </Tooltip>
                </td>
              </tr>
            )) : 
            <tr>
              <td style={{ marginTop: 10 }} className="no-data" colSpan={tableHeader.length}>
                No jobs available
              </td>
            </tr>
            }
          </tbody>
        </table>
        {loadingMessages && <CircularLoading/>}
      </div>
      <ConfirmModal
        open={showConfirm}
        close={() => setShowConfirm(false)}
        delete={() => deleteJob(jobId)}
        item={"job"}
        loading={confirming}
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

export default JobPostingsPage;