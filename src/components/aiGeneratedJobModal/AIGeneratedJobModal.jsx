import React from 'react';
import "./AIGeneratedJobModal.css";
import { Modal, Chip, CircularProgress } from '@mui/material';

const AIGeneratedJobModal = ({
  open,
  onClose,
  generatedDescription,
  tags,
  handleSave,
  loading,
}) => {
  return (
    <Modal open={open} onClose={onClose}>
      <div className='modal-container'>
        <div className='card-row'>
          <div className='row-title'>Generated Description:</div>
          <textarea className='generated-description' value={generatedDescription}/>
        </div>
        <div className='card-row'>
          <div className='row-title'>Tags:</div>
          <div>
            {tags.map((tag, index) => (
              <Chip id='tags' key={index} label={tag}/>
            ))}
          </div>
        </div>
        <div className='button-container'>
          <button className='cancel-button' onClick={onClose}>Cancel</button>
          <button className='save-button' onClick={handleSave} disabled={loading}>
            {loading && <CircularProgress thickness={6} size={15} sx={{ color: '#C3C3C3' }} />} {loading ? 'Saving...' : 'Save Job'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AIGeneratedJobModal;