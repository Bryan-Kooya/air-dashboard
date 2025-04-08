import React, { useState, useEffect } from 'react';
import { Modal, CircularProgress, Select, MenuItem } from '@mui/material';
import './EditContactModal.css';
import { workSetupList } from '../../utils/constants';

const EditContactModal = (props) => {
  const isOpen = props.open;
  const isClose = props.close;
  const contact = props.contact;
  const isLoading = props.loading;
  const handleEditInputChange = props.handleEditInputChange;
  const updateContact = props.updateContact;

  const handleClose = async () => {
    isClose();
  };

  return (
    <Modal open={isOpen} onClose={() => handleClose()}>
      <div className='modal-container'>
        <div className='card-row details'>
          <div className="input-row">
            <div className="card-row">
              <div className="row-title">Name:</div>
              <input 
                placeholder="Enter name"
                className="job-info-input"
                name="name"
                value={contact.name}
                onChange={handleEditInputChange}
              />
            </div>
            <div className="card-row">
              <div className="row-title">Phone Number:</div>
              <input 
                placeholder="Enter phone number"
                className="job-info-input"
                name="phone"
                value={contact.phone}
                onChange={handleEditInputChange}
              />
            </div>
          </div>
          <div className="input-row">
            <div className="card-row">
              <div className="row-title">Email:</div>
              <input 
                placeholder="Enter email"
                className="job-info-input"
                name="email"
                value={contact.email}
                onChange={handleEditInputChange}
              />
            </div>
            <div className="card-row">
              <div className="row-title">Location:</div>
              <input 
                placeholder="Enter location"
                className="job-info-input"
                name="location"
                value={contact.location}
                onChange={handleEditInputChange}
              />
            </div>
          </div>
          <div className="input-row">
            <div className="card-row">
              <div className="row-title">Work setup:&nbsp;&nbsp;</div>
              <Select
                id="select-input"
                sx={{width: '100%'}}
                displayEmpty
                name="workSetup"
                value={contact.workSetup}
                onChange={(e) => handleEditInputChange(e)}
                renderValue={() =>
                  contact.workSetup ? contact.workSetup : "Select setup"
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
            <div className="card-row">
              <div className="row-title">Salary:</div>
              <input 
                placeholder="Enter salary"
                className="job-info-input"
                type='number'
                name="salary"
                value={contact.salary}
                onChange={handleEditInputChange}
              />
            </div>
          </div>
        </div>
        <div style={{marginTop: 20}} className='button-container'>
          <button className='cancel-button' onClick={handleClose}>Cancel</button>
          <button className='save-button' onClick={() => updateContact(contact)} disabled={isLoading}>
            {isLoading && 
            <CircularProgress 
              thickness={6} 
              size={15} 
              sx={{ color: '#C3C3C3' }} 
            />} 
            {isLoading ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EditContactModal;