import React, { useState, useEffect } from 'react';
import { Modal, CircularProgress, Select, MenuItem, FormHelperText, Tooltip } from '@mui/material';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, query, where, orderBy, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from '../../firebaseConfig';

const AddGeneralQuestionModal = (props) => {
  const categories = ['General', 'Technical'];
  const difficulties = ['Basic', 'Intermediate', 'Advanced'];

  const isOpen = props.open;
  const isClose = props.close;
  const isLoading = props.loading;
  const question = props.question;
  const handleAddInputChange = props.handleAddInputChange;
  const addQuestion = props.handleAddQuestion;
  const userId = props.userId;

  const [companies, setCompanies] = useState([]);
  const [jobs, setJobs] = useState([]);
  
  const handleClose = async () => {
    isClose();
  };

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const jobsCollection = collection(db, 'jobs');
        let q = query(
          jobsCollection, 
          where("userId", "==", userId), 
          orderBy("timestamp"),   
        );
        const jobSnapshot = await getDocs(q);
        const jobData = jobSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        const companies = [... new Set(jobData.map(job => job.company_name))];
        const jobs = [... new Set(jobData.map(job => job.job_title))];
        setJobs(jobs);
        setCompanies(companies);
      } catch (error) {
        console.error('Error fetching jobs:', error);
      }
    };

    fetchJobs();
  }, []);

  return (
    <Modal open={isOpen} onClose={() => handleClose()}>
      <div className='modal-container'>
        <div className='card-row details'>
          <div className="input-row">
            <div className="card-row">
              <div className="row-title">
                Category:
              </div>
              <Select
                id="select-input"
                displayEmpty
                value={question?.skillCategory}
                name='skillCategory'
                onChange={handleAddInputChange}
                renderValue={() =>
                  question?.skillCategory ? question?.skillCategory : "Select category"
                }
              >
                {categories
                  ?.map((category, index) => (
                    <MenuItem id="options" key={index} value={category}>
                      {category}
                    </MenuItem>
                  ))}
              </Select>
            </div>
            <div className="card-row">
              <div className="row-title">Difficulty:</div>
              <Select
                id="select-input"
                disabled={question?.skillCategory === 'General'}
                displayEmpty
                value={question?.difficulty}
                name='difficulty'
                onChange={handleAddInputChange}
                renderValue={() =>
                  question?.difficulty ? question?.difficulty : "Select difficulty"
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
          </div>
          <div className="input-row">
            <div className="card-row">
              <div className="row-title">
                Job title:
              </div>
              <Select
                id="select-input"
                displayEmpty
                value={question?.jobTitle}
                name='jobTitle'
                onChange={handleAddInputChange}
                renderValue={() =>
                  question?.jobTitle ? question?.jobTitle : "Select job title"
                }
              >
                {jobs
                  ?.map((job, index) => (
                    <MenuItem id="options" key={index} value={job}>
                      {job}
                    </MenuItem>
                  ))}
              </Select>
            </div>
            <div className="card-row">
              <div className="row-title">Company:</div>
              <Select
                id="select-input"
                displayEmpty
                value={question?.company}
                name='company'
                onChange={handleAddInputChange}
                renderValue={() =>
                  question?.company ? question?.company : "Select company"
                }
              >
                {companies
                  .map((company, index) => (
                    <MenuItem id="options" key={index} value={company}>
                      {company}
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
                required={question?.skillCategory !== 'General'}
                placeholder="Enter answer"
                className={`job-info-input ${!question?.answer && question?.skillCategory !== 'General' && 'required-field'}`}
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

export default AddGeneralQuestionModal;
