import React from 'react';
import "./ConfirmModal.css";
import { Modal } from '@mui/material';
import { InfoIcon } from '../../assets/images';

const ConfirmModal = (props) => {
  const open = props.open;
  const close = props.close;
  const deleteConvo = props.delete;
  return (
    <Modal open={open} onClose={close}>
      <div className='confirm-container'>
        <img src={InfoIcon} alt='Info'/>
        <div>
          <div className='card-title'>Delete</div>
          <div className='confirm-message'>Are you sure that you want to delete this message? All data about this message will be lost.</div>
        </div>
        <div className='button-container'>
          <button onClick={close} className='secondary-button'>Cancel</button>
          <button onClick={deleteConvo} className='primary-button'>Delete</button>
        </div>
      </div>
    </Modal>
  );
}

export default ConfirmModal;