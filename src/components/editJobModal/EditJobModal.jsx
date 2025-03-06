import React, { useState, useEffect } from 'react';
import "./EditJobModal.css";
import { Modal, Chip, CircularProgress, Menu, MenuItem } from '@mui/material';
import { CirclePlus } from '../../assets/images';

const EditJobModal = (props) => {
  const isOpen = props.open;
  const selectedJob = props.job;
  const isClose = props.close;
  const handleEditInputChange = props.handleEditInputChange;
  const updateJob = props.updateJob;
  const isLoading = props.loading;
  const handleRequiredTags = props.handleRequiredTags;
  const updateMessage = props.updateMessage;

  const tags = selectedJob.mandatory_tags;

  // Local state for MandatoryTags
  const [localRequiredTags, setLocalRequiredTags] = useState(selectedJob.required_tags || []);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);

  // Update localRequiredTags when selectedJob.required_tags changes
  useEffect(() => {
    setLocalRequiredTags(selectedJob.required_tags || []);
    if(selectedJob.required_tags?.length === 0 && selectedJob.enableMandatory) {
      selectedJob.enableMandatory = false;
    }
  }, [selectedJob.required_tags]);

  // Function to handle tag click
  const handleTagClick = async (tag) => {
    if (localRequiredTags.length >= 2) {
      updateMessage("Maximum two mandatory tags allowed. Remove one existing tags to add another new one.", "warning", true);
      return;
    }
    if (selectedJob.id && tag) {
      const updatedTags = [...localRequiredTags, tag];
      await handleRequiredTags(selectedJob.id, updatedTags);
      selectedJob.required_tags = updatedTags;
      selectedJob.enableMandatory = true;
      setLocalRequiredTags(updatedTags);
    }
  };

  // Function to handle tag removal
  const handleRemoveTag = async (tagToRemove) => {
    if (selectedJob.id) {
      const updatedTags = localRequiredTags.filter((tag) => tag !== tagToRemove);
      await handleRequiredTags(selectedJob.id, updatedTags);
      selectedJob.required_tags = updatedTags;
      selectedJob.enableMandatory = true;
      setLocalRequiredTags(updatedTags);
    }
  };

  const handleClose = async (job) => {
    // await updateJob(job);
    isClose();
  };

  const handleMenuOpen = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setFilterAnchorEl(null);
  };

  return (
    <Modal open={isOpen} onClose={() => handleClose(selectedJob)}>
      <div className='modal-container'>
        <div className='card-row details'>
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
          <div className='card-row'>
            <div className='row-title'>Mandatory Tags:</div>
            {selectedJob.required_tags?.length === 0 && 
            <div style={{width: 'fit-content'}} className="error-message">
              The Mandatory Tags feature for this job will be disabled because no tags have been added.
            </div>}
            <div style={{display: 'flex', flexWrap: 'wrap', alignItems: 'center'}}>
              {localRequiredTags.slice(0, 2).map((tag, index) => (
                <Chip
                  key={index}
                  id='tags'
                  label={tag}
                  onDelete={() => handleRemoveTag(tag)} // Add delete button
                />
              ))}
              <img onClick={handleMenuOpen} style={{margin: 4}} height={20} src={CirclePlus}/>
              <Menu
                // sx={{marginTop: '11px', left: '-32px'}}
                anchorEl={filterAnchorEl}
                open={Boolean(filterAnchorEl)}
                onClose={handleMenuClose}
              >
                {selectedJob.job_title_tags?.map((tag, index) => (
                  <MenuItem
                    id="options"
                    onClick={() => handleTagClick(tag)}
                    disabled={localRequiredTags.includes(tag)}
                  >
                    {tag}
                  </MenuItem>
                ))}
              </Menu>
            </div>
          </div>
          <div className='card-row'>
            <div className='row-title'>Tags:</div>
            <div>
              {tags?.map((tag, index) => (
                <Chip
                  id='tags'
                  key={index}
                  label={tag}
                />
              ))}
            </div>
          </div>
          <div className="card-row">
            <div className="row-title">Job Description:</div>
            <textarea
              style={{ height: 300 }}
              className="job-description"
              placeholder="Enter job description"
              name="description"
              value={selectedJob.description}
              onChange={handleEditInputChange}
            />
          </div>
        </div>
        <div className='button-container'>
          <button className='cancel-button' onClick={() => handleClose(selectedJob)}>Cancel</button>
          <button className='save-button' onClick={() => updateJob(selectedJob)} disabled={isLoading}>
            {isLoading && <CircularProgress thickness={6} size={15} sx={{ color: '#C3C3C3' }} />} {isLoading ? 'Saving...' : 'Save Job'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditJobModal;