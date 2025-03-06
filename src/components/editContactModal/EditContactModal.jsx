import React, { useState, useEffect } from 'react';
import { Modal, CircularProgress } from '@mui/material';
import './EditContactModal.css';

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
        </div>
        <div className='button-container'>
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