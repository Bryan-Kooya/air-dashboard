import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import axios from "axios";
import "./JobPostingsPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "../../firebaseConfig";
import { CircularProgress } from '@mui/material';
import AIGeneratedJobModal from "../../components/aiGeneratedJobModal/AIGeneratedJobModal";
import EditJobModal from "../../components/editJobModal/EditJobModal";

const JobPostingsPage = (props) => {
  const tableHeader = ["Job Title", "Company", "Industry", "Location", "Actions"];
  const [jobs, setJobs] = useState([]);
  const [job, setJob] = useState([]);
  const [formData, setFormData] = useState({
    job_title: '',
    company_name: '',
    industry: '',
    location: '',
    description: '',
  });
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isGenerateModalOpen, setAIGenerateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const navigate = useNavigate();

  console.log('Jobs:', jobs)

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
      const response = await fetch('/generate', {
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
        company_name: formData.company_name,
        industry: formData.industry,
        location: formData.location,
        description: generatedDescription,
        tags: tags.join(','),
      };

      console.log('Saving job data:', jobData);

      // Save to Firebase
      const docRef = await addDoc(collection(db, "jobs"), jobData);
      setJobs([...jobs, { id: docRef.id, ...jobData }]);
      console.log("Job saved successfully with ID:", docRef.id);
      
      // Reset form after successful save
      setFormData({
        job_title: '',
        company_name: '',
        industry: '',
        location: '',
        description: '',
      });
      setGeneratedDescription('');
      setAIGenerateModalOpen(false);
      setTags([]);
      
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

  // Fetch jobs from Firebase Firestore
  const fetchJobs = async () => {
    const jobsCollection = collection(db, "jobs");
    const jobsSnapshot = await getDocs(jobsCollection);
    const jobsList = jobsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setJobs(jobsList);
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Create a new job
  // const createJob = async () => {
  //   try {
  //     const response = await axios.post("/api/generate", newJob); // Call OpenAI API
  //     const { description, tags } = response.data;

  //     const jobData = { ...newJob, description, tags };

  //     // Save to Firebase
  //     const docRef = await addDoc(collection(db, "jobs"), jobData);
  //     setJobs([...jobs, { id: docRef.id, ...jobData }]);
  //     setNewJob({
  //       job_title: "",
  //       company_name: "",
  //       industry: "",
  //       location: "",
  //       description: "",
  //     });
  //   } catch (error) {
  //     console.error("Error creating job:", error);
  //   }
  // };

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
    try {
      const jobDoc = doc(db, "jobs", id);
      await deleteDoc(jobDoc);
      setJobs(jobs.filter((job) => job.id !== id));
    } catch (error) {
      console.error("Error deleting job:", error);
    }
  };

  const setHeaderTitle = () => {
    props.title("Job Postings");
    props.subtitle("Add new job postings and manage existing ones, streamlining the recruitment process.");
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  setHeaderTitle();

  return (
    <div className="job-postings-container">
      <div className="add-job card">
        <div className="card-title">Add a New Job</div>
        <div className="input-row">
          <div className="card-row">
            <div className="row-title">Job Title:</div>
            <input 
              placeholder="Enter job title"
              className="job-info-input"
              name="job_title"
              value={formData.job_title}
              onChange={handleInputChange}
            />
          </div>
          <div className="card-row">
            <div className="row-title">Company Name:</div>
            <input 
              placeholder="Enter company name"
              className="job-info-input"
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
        <button disabled={loading} onClick={handleAICreateJob} className="add-job-button">{loading ? <CircularProgress thickness={6} size={20} sx={{ color: '#C3C3C3' }} /> : "AI Create Job"}</button>
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
        <div className="card-title">Recently Added Jobs</div>
        <table className="jobs-table">
          <thead>
            <tr>
              {tableHeader.map(header => (
                <th>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => (
              <tr key={job.id}>
                <td>{job.job_title}</td>
                <td>{job.company_name}</td>
                <td>{job.industry}</td>
                <td>{job.location}</td>
                <td>
                  <button
                    className="edit-button"
                    onClick={() => handleEditJob(job.id)}
                    // onClick={() =>
                    //   updateJob(job.id, {
                    //     ...job,
                    //     description: job.description + " (Updated)",
                    //   })
                    // }
                  >
                    Edit
                  </button>
                  <button onClick={() => deleteJob(job.id)} className="delete-button">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default JobPostingsPage;