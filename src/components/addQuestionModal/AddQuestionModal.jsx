import React, { useState, useEffect } from 'react';
import { Modal, CircularProgress, Select, MenuItem, FormHelperText } from '@mui/material';
import './AddQuestionModal.css';

const AddQuestionModal = (props) => {
  const difficulties = ['Basic', 'Intermediate', 'Advanced'];
  const isOpen = props.open;
  const isClose = props.close;
  const isLoading = props.loading;
  const skillCategories = props.skillCategories;
  const question = props.question;
  const handleAddInputChange = props.handleAddInputChange;
  const addQuestion = props.handleAddQuestion;

  const handleClose = async () => {
    isClose();
  };

  return (
    <Modal open={isOpen} onClose={() => handleClose()}>
      <div className='modal-container'>
        <div className='card-row details'>
          <div className="input-row">
            <div className="card-row">
              <div className="row-title">Difficulty:</div>
              <Select
                id="select-input"
                displayEmpty
                value={question?.difficulty}
                name='difficulty'
                onChange={handleAddInputChange}
                renderValue={() =>
                  question?.difficulty ? question?.difficulty : "Select Difficulty"
                }
              >
                {difficulties
                  .map((difficulty, index) => (
                    <MenuItem id="options" key={index} value={difficulty}>
                      {difficulty}
                    </MenuItem>
                  ))}
              </Select>
            </div>
            <div className="card-row">
              <div className="row-title">Skill Category:</div>
              <Select
                id="select-input"
                displayEmpty
                value={question?.skillCategory}
                name='skillCategory'
                onChange={handleAddInputChange}
                renderValue={() =>
                  question?.skillCategory ? question?.skillCategory : "Select Skill Category"
                }
              >
                {skillCategories
                  ?.map((category, index) => (
                    <MenuItem id="options" key={index} value={category}>
                      {category}
                    </MenuItem>
                  ))}
              </Select>
            </div>
          </div>
          <div className="input-row">
            <div className="card-row">
              <div className="row-title">Question:</div>
              <input 
                required
                placeholder="Enter question"
                className={`job-info-input ${!question?.question && 'required-field'}`}
                name="question"
                value={question?.question}
                onChange={handleAddInputChange}
              />
            </div>
            <div className="card-row">
              <div className="row-title">Answer:</div>
              <input 
                required
                placeholder="Enter answer"
                className={`job-info-input ${!question?.answer && 'required-field'}`}
                name="answer"
                value={question?.answer}
                onChange={handleAddInputChange}
              />
            </div>
          </div>
          <div className="input-row">
            <div className="card-row">
              <div className="row-title">Options:</div>
              <input 
                placeholder="Enter options (comma separated)"
                className="job-info-input"
                name="options"
                value={question?.options?.join(",")}
                onChange={handleAddInputChange}
              />
              <FormHelperText sx={{margin: '-9px 0 0 4px'}}>
                For multiple-choice questions, separate each option with a comma.
              </FormHelperText>
            </div>
          </div>
        </div>
        <div className='button-container'>
          <button className='cancel-button' onClick={handleClose}>Cancel</button>
          <button className='save-button' onClick={addQuestion} disabled={isLoading}>
            {isLoading && 
            <CircularProgress 
              thickness={6} 
              size={15} 
              sx={{ color: '#C3C3C3' }} 
            />} 
            {isLoading ? 'Saving...' : 'Save Question'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AddQuestionModal;