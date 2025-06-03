import React, { useState, useEffect } from 'react';
import "./EditJobModal.css";
import { Modal, Chip, CircularProgress, Menu, MenuItem, Select, TextField, Autocomplete } from '@mui/material';
import { CirclePlus } from '../../assets/images';
import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

const EditJobModal = (props) => {
  const years = ["<1 year", "2-4 years", "5-7 years", "8-10 years", "11+ years"]
  const industries = ["Bank", "Health", "Insurance", "IT", "Security", "Others"];
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
  const [localMandatoryTags, setLocalMandatoryTags] = useState(selectedJob.mandatory_tags || []);
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [availableTags, setAvailableTags] = useState([]);
  const [searchValue, setSearchValue] = useState('');

  // Update local states when selectedJob changes
  useEffect(() => {
    setLocalRequiredTags(selectedJob.required_tags || []);
    setLocalMandatoryTags(selectedJob.mandatory_tags || []);
    if(selectedJob.required_tags?.length === 0 && selectedJob.enableMandatory) {
      selectedJob.enableMandatory = false;
    }
  }, [selectedJob.required_tags, selectedJob.mandatory_tags]);

  // Fetch all available tags from database
  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const jobsCollection = collection(db, "jobs");
        const q = query(jobsCollection, where("userId", "==", selectedJob.userId || props.userId));
        const snapshot = await getDocs(q);
        
        const allTags = new Set();
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          // Collect tags from mandatory_tags, job_title_tags, and alternative tags
          if (data.mandatory_tags) data.mandatory_tags.forEach(tag => allTags.add(tag));
          if (data.job_title_tags) data.job_title_tags.forEach(tag => allTags.add(tag));
          if (data.alternative_mandatory_tags_en) data.alternative_mandatory_tags_en.forEach(tag => allTags.add(tag));
          if (data.alternative_mandatory_tags_he) data.alternative_mandatory_tags_he.forEach(tag => allTags.add(tag));
          if (data.alternative_job_title_tags_en) data.alternative_job_title_tags_en.forEach(tag => allTags.add(tag));
          if (data.alternative_job_title_tags_he) data.alternative_job_title_tags_he.forEach(tag => allTags.add(tag));
        });
        
        setAvailableTags(Array.from(allTags).sort());
      } catch (error) {
        console.error('Error fetching available tags:', error);
      }
    };

    if (isOpen && (selectedJob.userId || props.userId)) {
      fetchAvailableTags();
    }
  }, [isOpen, selectedJob.userId, props.userId]);

  const hasYearTag = () => {
    return tags?.some(tag => /\d+-\d+\s*(year|years|שנה|שנים)/i.test(tag));
  };

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

  // Function to handle mandatory tag removal
  const handleRemoveMandatoryTag = async (tagToRemove) => {
    if (selectedJob.id) {
      try {
        const updatedTags = localMandatoryTags.filter((tag) => tag !== tagToRemove);
        
        // Update in Firebase
        const jobDoc = doc(db, "jobs", selectedJob.id);
        await updateDoc(jobDoc, { mandatory_tags: updatedTags });
        
        // Update local state and selectedJob
        setLocalMandatoryTags(updatedTags);
        selectedJob.mandatory_tags = updatedTags;
        
        updateMessage("Tag removed successfully!", "success", true);
      } catch (error) {
        console.error("Error removing tag:", error);
        updateMessage("An error occurred while removing tag.", "error", true);
      }
    }
  };

  // Function to add new tag from search
  const handleAddTagFromSearch = async (newTag) => {
    if (!newTag || localMandatoryTags.includes(newTag)) {
      return;
    }
    
    if (selectedJob.id) {
      try {
        const updatedTags = [...localMandatoryTags, newTag];
        
        // Update in Firebase
        const jobDoc = doc(db, "jobs", selectedJob.id);
        await updateDoc(jobDoc, { mandatory_tags: updatedTags });
        
        // Update local state and selectedJob
        setLocalMandatoryTags(updatedTags);
        selectedJob.mandatory_tags = updatedTags;
        setSearchValue('');
        
        updateMessage("Tag added successfully!", "success", true);
      } catch (error) {
        console.error("Error adding tag:", error);
        updateMessage("An error occurred while adding tag.", "error", true);
      }
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

  // Filter available tags based on search and exclude already added tags
  const filteredAvailableTags = availableTags.filter(tag => 
    !localMandatoryTags.includes(tag) && 
    tag.toLowerCase().includes(searchValue.toLowerCase())
  );

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
              <Select
                id="select-input"
                displayEmpty
                name="industry"
                value={selectedJob.industry}
                onChange={handleEditInputChange}
                renderValue={() =>
                  selectedJob.industry ? selectedJob.industry : "Select company industry"
                }
              >
                {industries
                  .map((industry, index) => (
                    <MenuItem id="options" key={index} value={industry}>
                      {industry}
                    </MenuItem>
                  ))}
              </Select>
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
          <div className="input-row">
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
            <div className="card-row">
              <div className="row-title">Years of experience:</div>
              <Select
                id="select-input"
                displayEmpty
                value={selectedJob?.years}
                name='years'
                onChange={handleEditInputChange}
                disabled={hasYearTag()} // Disable if years of experience tag exists
                renderValue={() =>
                  selectedJob?.years ? selectedJob?.years: "Select Years"
                }
              >
                {years
                  .map((year, index) => (
                    <MenuItem id="options" key={index} value={year}>
                      {year}
                    </MenuItem>
                  ))}
              </Select>
            </div>
          </div>
          <div className='card-row'>
            <div className='flex row-title' style={{alignItems: 'center'}}>Tags: 
            <Autocomplete
                freeSolo
                options={filteredAvailableTags}
                value={searchValue}
                onInputChange={(event, newInputValue) => {
                  setSearchValue(newInputValue);
                }}
                onChange={(event, newValue) => {
                  if (newValue) {
                    handleAddTagFromSearch(newValue);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder="Search and add tags..."
                    variant="outlined"
                    size="small"
                    onKeyPress={(event) => {
                      if (event.key === 'Enter' && searchValue.trim()) {
                        handleAddTagFromSearch(searchValue.trim());
                      }
                    }}
                  />
                )}
                style={{ width: '50%' }}
                noOptionsText="No matching tags found"
              />
            </div>
            <div>
              <div style={{display: 'flex', flexWrap: 'wrap', marginBottom: '10px'}}>
                {localMandatoryTags?.map((tag, index) => (
                  <Chip
                    onClick={() => handleTagClick(tag)}
                    id='tags'
                    key={index}
                    label={tag}
                    onDelete={() => handleRemoveMandatoryTag(tag)}
                    style={{ margin: '2px' }}
                  />
                ))}
              </div>
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