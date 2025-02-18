import React, { useState } from 'react';
import "./EditJobModal.css";
import { Modal, Chip, CircularProgress } from '@mui/material';

const EditJobModal = (props) => {
  const isOpen = props.open;
  const selectedJob = props.job;
  const isClose = props.close;
  const handleEditInputChange = props.handleEditInputChange;
  const updateJob = props.updateJob;
  const isLoading = props.loading;
  const mandatoryTags = selectedJob.mandatory_tags?.split(',');

  return (
    <Modal open={isOpen} onClose={isClose}>
      <div className='modal-container'>
        <div className="input-row">
          <div className="card-row">
            <div className="row-title">Job Title:</div>
            <input 
              placeholder="Enter job title"
              className="job-info-input"
              name="job_title"
              value={selectedJob.job_title}
              onChange={handleEditInputChange}
            />
          </div>
          <div className="card-row">
            <div className="row-title">Company Name:</div>
            <input 
              placeholder="Enter company name"
              className="job-info-input"
              name="company_name"
              value={selectedJob.company_name}
              onChange={handleEditInputChange}
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
              value={selectedJob.industry}
              onChange={handleEditInputChange}
            />
          </div>
          <div className="card-row">
            <div className="row-title">Company location:</div>
            <input 
              placeholder="Enter company location"
              className="job-info-input"
              name="location"
              value={selectedJob.location}
              onChange={handleEditInputChange}
            />
          </div>
        </div>
        {selectedJob.enableMandatory &&
        <div className='card-row'>
          <div className='row-title'>Mandatory tags:</div>
          <div>
            {mandatoryTags?.map((tag, index) => (
              <Chip id='tags' key={index} label={tag}/>
            ))}
          </div>
        </div>}
        <div className="card-row">
          <div className="row-title">Job Description:</div>
          <textarea
            style={{height: 300}}
            className="job-description"
            placeholder="Enter job description"
            name="description"
            value={selectedJob.description}
            onChange={handleEditInputChange}
          />
        </div>
        <div className='button-container'>
          <button className='cancel-button' onClick={isClose}>Cancel</button>
          <button className='save-button' onClick={() => updateJob(selectedJob)} disabled={isLoading}>
            {isLoading ? <CircularProgress thickness={6} size={20} sx={{ color: '#C3C3C3' }} /> : 'Save Description'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditJobModal;