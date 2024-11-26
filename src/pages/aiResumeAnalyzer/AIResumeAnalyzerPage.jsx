import React, { useState, useEffect } from 'react';
import "./AIResumeAnalyzerPage.css";
import { UploadIcon } from "../../assets/images";
import { TextField, Button, CircularProgress, Typography } from "@mui/material";
import axios from 'axios';
import { useDropzone } from 'react-dropzone';

const AIResumeAnalyzerPage = ({ title, subtitle }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onDrop = (acceptedFiles) => {
    setFile(acceptedFiles[0]);
    setError(null);
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: '.pdf, .doc, .docx',
    multiple: false,
  });

  // Dynamically set header title and subtitle when the component mounts
  useEffect(() => {
    title("AI Resume Analyzer");
    subtitle("Choose the job title and paste tags below to find the best candidates.");
  }, [title, subtitle]);

  const handleSubmit = async () => {
    if (!file) {
      setError('Please upload a file');
      return;
    }

    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    if (jobDescription) formData.append('jobDescription', jobDescription);

    try {
      const response = await axios.post('/api/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });      
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while processing the resume.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="analyzer-container">
      {/* File Upload Section */}
      <div {...getRootProps()} className={`upload-container ${file ? 'uploaded' : ''}`}>
        <input {...getInputProps()} />
        <img className="upload-icon" src={UploadIcon} alt="Upload" />
        <div className="upload-row">
          <div className="label-container">
            <div className="row1-label">Drag and Drop or choose your file for upload</div>
            <div className="row2-label">Upload multiple resumes for comparison (PDF, DOC, DOCX)</div>
          </div>
          <div className="button-container">
            <button className="browse-button">Browse file</button>
            <button className="import-button">Import from LinkedIn</button>
          </div>
        </div>
        {file && <Typography variant="body2" className="file-name">Selected File: {file.name}</Typography>}
      </div>

      {/* Job Description Input */}
      <div className="description-container">
        <div>Job Description</div>
        <TextField
          id="input-description"
          placeholder="Paste job description here (optional) - Adding a job description will provide matching analysis"
          multiline
          fullWidth
          rows={4}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
        />
      </div>

      {/* Submit Button */}
      <div className="submit-container">
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Analyze Resume'}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Typography variant="body2" color="error" className="error-message">
          {error}
        </Typography>
      )}

      {/* Results Section */}
      {result && (
        <div className="results-container">
          <Typography variant="h5">Analysis Results</Typography>
          <div className="result-section">
            <Typography variant="h6">Contact Information</Typography>
            <Typography>Name: {result.contact.name}</Typography>
            <Typography>Email: {result.contact.email}</Typography>
            <Typography>LinkedIn: {result.contact.linkedin}</Typography>
          </div>
          <div className="result-section">
            <Typography variant="h6">Skills</Typography>
            <Typography>{result.skills.join(', ')}</Typography>
          </div>
          <div className="result-section">
            <Typography variant="h6">Experience</Typography>
            <Typography>{result.experience || 'N/A'}</Typography>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIResumeAnalyzerPage;