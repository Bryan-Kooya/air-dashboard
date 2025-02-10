import React, { useState } from 'react';
import "./CandidateDetailsModal.css";
import { Modal, Select, CircularProgress, LinearProgress, Tooltip, MenuItem, Rating, Divider } from '@mui/material';
import { Close, Bookmark, DeleteIcon, InterviewIcon, EmailIcon, SkillsIcon, ExperienceIcon, EducationIcon, DatabaseIcon, PeopleIcon, TooltipIcon } from '../../assets/images';
import { capitalizeFirstLetter, handleRedirectToLinkedIn, scoreColor } from '../../utils/utils';
import ConfirmModal from '../confirmModal/ConfirmModal';
import { db } from '../../firebaseConfig';
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import ScoreGauge from '../scoreGauge/ScoreGauge';
import IntroEmailModal from '../introEmailModal/IntroEmailModal';
import InterviewPrepModal from '../interviewPrepModal/InterviewPrepModal';
import { apiBaseUrl } from '../../utils/constants';

const CandidateDetailsModal = (props) => {
  const tabs = ["Personal", "Experience", "Education", "Certification", "Projects"];
  const statusList = ['Selected', 'Irrelevant', 'Waiting for approval', 'Interviewed', 'Salary draft'];
  const open = props.open;
  const close = props.close;
  const candidate = props.candidate;
  const isEditable = props.isEditable;
  const userInfo = props.userInfo;
  const updateContact = props.updateContact;
  const saveCandidate = props.saveCandidate;
  const handleRejectCandidate = props.handleRejectCandidate;
  const updateChanges = props.updateChanges;
  const updateMessage = props.updateMessage;
  const updateTable = props.updateTable;
  const email = candidate.contact?.email?.toLowerCase();
  const [showSelectStatus, setShowSelectStatus] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(candidate.status);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showGeneratedEmail, setShowGeneratedEmail] = useState(false);
  const [showInterviewPrep, setShowInterviewPrep] = useState(false);
  const [prepData, setPrepData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadSaveButton, setLoadSaveButton] = useState(false);
  const [status, setStatus] = useState(candidate.status); 
  const [confirming, setConfirming] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  const handleIconClick = async () => {
    if (isEditable) setShowConfirm(true);
    else {
      setLoadSaveButton(true);
      await saveCandidate(candidate);
      setStatus("Selected")
      setTimeout(() => setLoadSaveButton(false), 700);
      handleClose();
    }
  };

  const handleClose = () => {
    close();
    setShowSelectStatus(false);
  };

  const handleEditOrReject = async () => {
    if (isEditable) {
      if (showSelectStatus) {
        setSelectedStatus(candidate.status);
      } else {
        setShowSelectStatus(true);
        setSelectedStatus(candidate.status);
      }
    } else {
      await handleRejectCandidate();
      handleClose();
    }
  };

  const handleSelectStatus = (value) => {
    setSelectedStatus(value);
  };

  const handleViewOrSaveChanges = async () => {
    if (isEditable && showSelectStatus) {
        setSaving(true);
        await updateChanges(candidate, selectedStatus);
        candidate.status = selectedStatus;
        setShowSelectStatus(false);
        setSaving(false);
    } else {
      const openNewTab = handleRedirectToLinkedIn(candidate.contact?.linkedin);
      if (!openNewTab) updateMessage("LinkedIn profile is not available for this candidate.", 'info', true);
    }
  };

  const generatePrep = async () => {
    setLoading(true);
    console.log("Candidate: ", candidate);
    try {
      if (
        candidate?.interviewPrep &&
        (
          candidate.interviewPrep.questions?.length > 0 ||
          candidate.interviewPrep.keyTopics?.length > 0 ||
          candidate.interviewPrep.preparationTips?.length > 0
        )
      ) {
        // Use existing interview prep data
        console.log("Using existing interview prep data.");
        setPrepData(candidate.interviewPrep);
      } else {
        // Generate new interview prep data
        const response = await fetch(`${apiBaseUrl}/generate-interview-prep`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobTitle: candidate.jobTitle,
            jobDescription: candidate.jobDescription,
            resumeData: candidate.resumeText,
          }),
        });
  
        if (!response.ok) {
          throw new Error(await response.text());
        }
  
        const data = await response.json();
        setPrepData(data);
  
        // Update Firestore if editable
        if (isEditable) {
          const candidateDoc = doc(db, "candidates", candidate.id);
          await updateDoc(candidateDoc, { interviewPrep: data });
          console.log("Updated Firestore with new interview prep data.");
          console.log("Updated candidate locally with new interview prep data.");
        } else {
          await updateContact(candidate, candidate.status, data);
          console.log("Updated contact with new interview prep data.");
        }
        // Update the candidate locally
        candidate.interviewPrep = data; // Update the local candidate object
      }
    } catch (error) {
      console.error("Error generating interview prep:", error);
      updateMessage("Failed to generate interview prep. Please try again later.", "error", true);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  };  

  const handleInterviewPrep = async () => {
    await generatePrep();
    setTimeout(() => setShowInterviewPrep(true), 800);
  };

  const deleteCandidate = async (id) => {
    setConfirming(true);
    try {
      const candidateDoc = doc(db, "candidates", id);
      await deleteDoc(candidateDoc);
      await updateTable();
      setTimeout(() => setConfirming(false), 500);
      setShowConfirm(false);
      handleClose();
      updateMessage("Candidate deleted successfully!", "success", true);
    } catch (error) {
      console.error("Error deleting job:", error);
      setTimeout(() => setConfirming(false), 500);
      setShowConfirm(false);
      updateMessage("An error occurred while deleting candidate", "error", true);
    }
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <div className='candidate-modal-container'>
        <div className='candidate-modal-row1'>
          <div className='card-title'>{capitalizeFirstLetter(candidate.contact?.name)}</div>
          <img onClick={handleClose} src={Close} alt='Close'/>
        </div>
        <div className='candidate-modal-row2'>
          {isEditable &&
          <div className='contact-section'>
            <div className='section-title'>Status</div>
            {showSelectStatus ?
            <Select 
              id="select-input"
              sx={{width: 210}}
              displayEmpty
              value={selectedStatus} 
              onChange={(e) => handleSelectStatus(e.target.value)}
            >
              {statusList.map((status, index) => (
                <MenuItem key={index} value={status}>
                  <div className='status-container'>
                    <div className={`status-badge ${status?.toLowerCase().replace(/\s/g, "-")}`}></div>{status}
                  </div>
                </MenuItem>
              ))}
            </Select> :
            <div className='status-container'>
              <div className={`status-badge ${candidate.status?.toLowerCase().replace(/\s/g, "-")}`}></div>{candidate.status}
            </div>}
          </div>}
          <div className='contact-section'>
            <div className='section-title'>Detailed Scores</div>
            <div className='score-row' style={{marginBottom: 20, gap: 25}}>
              <div><span className='light-label'>Job Match: </span><span>{candidate.scores?.job_title_relevance.score}%</span></div>
              <div><span className='light-label'>Resume Quality: </span><span>{candidate.scores?.presentation.score}%</span></div>
              <div><span className='light-label'>Skills Match: </span><span>{candidate.skill_match?.score}%</span></div>
            </div>
            <div className='metric-section'>
              <ScoreGauge title={"Resume Quality"} value={candidate.scores?.presentation.score}/>
              <ScoreGauge title={"Job Match"} value={candidate.scores?.job_title_relevance.score}/>
              <div className='action-button-container'>
                <button disabled={loading} onClick={handleInterviewPrep} className='action-button'>
                  {loading ? 
                    <>
                      <CircularProgress thickness={5} size={10} color='black'/>Generating...
                    </> : 
                    <>
                    <img src={InterviewIcon}/>Interview Prep
                    </>
                  }
                </button>
                <button onClick={() => setShowGeneratedEmail(true)} className='action-button'><img src={EmailIcon}/>Generate Intro Email</button>
              </div>
            </div>
          </div>
          <div className='contact-section'>
            <div className='section-title'>Match Analysis</div>
            <div className='section-info'>
              <div className='score-label'>
                <img src={SkillsIcon}/>Skills
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.scores?.skills.score}%<span className='light-label'>(Weight: 40%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.scores?.skills.score}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#0A66C2",
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-label'>
                <img src={ExperienceIcon}/>Experience
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.scores?.experience.score}%<span className='light-label'>(Weight: 30%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.scores?.experience.score}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#0A66C2",
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-label'>
                <img src={EducationIcon}/>Education
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.scores?.education.score}%<span className='light-label'>(Weight: 15%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.scores?.education.score}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#0A66C2",
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-label'>
                <img src={DatabaseIcon}/>Domain Expertise
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.skill_match?.score}%<span className='light-label'>(Weight: 15%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.skill_match?.score}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#0A66C2",
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-row'>Overall Match Assesment</div>
              <div className='light-label'>{candidate.detailedAnalysis?.overall_match_fitness}</div>
            </div>
            <div className='section-info'>
              <div className='score-row'>Key Strengths</div>
              <div>
                {candidate.detailedAnalysis?.strengths_alignment.map((strength) => (
                  <li className='light-label'>{strength}</li>
                ))}
              </div>
            </div>
            <div className='section-info'>
              <div className='score-row'>Areas for Development</div>
              <div>
                {candidate.detailedAnalysis?.gap_analysis.map((area) => (
                  <li className='light-label'>{area}</li>
                ))}
              </div>
            </div>
            <div className='section-info'>
              <div className='score-row'>Growth Potential</div>
              <div className='light-label'>{candidate.detailedAnalysis?.growth_potential}</div>
            </div>
          </div>
          <div className='contact-section'>
            <div>
              <div className='section-title'>Match Confidence ({candidate.scores?.overall}%)</div>
              <div className='light-label'>Confidence level in the match assessment based on available data</div>
            </div>
            <div style={{padding: '10px 0px'}}>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.scores?.overall}
                sx={{
                  height: '12px !important',
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#0A66C2",
                  },
                }}
              />
              <div className='score-sublabel'>
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
            <div className='section-info'>
              <div className='score-row'>
                Data Completeness 
                <Tooltip title='How complete and detailed the resume information is'><img src={TooltipIcon}/></Tooltip>
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.scores?.presentation.score}%<span className='light-label'>(Weight: 30%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.scores?.presentation.score}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: scoreColor(candidate.scores?.presentation.score),
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-row'>
                Skills Match Accuracy 
                <Tooltip title='Confidence in the skills matching assessment'><img src={TooltipIcon}/></Tooltip>
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.skill_match?.score}%<span className='light-label'>(Weight: 25%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.skill_match?.score}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: scoreColor(candidate.skill_match?.score),
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-row'>
                Experience Validation
                <Tooltip title='Confidence in validating past experience and achievements'><img src={TooltipIcon}/></Tooltip>
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.scores?.experience.score}%<span className='light-label'>(Weight: 25%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.scores?.experience.score}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: scoreColor(candidate.scores?.experience.score),
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-row'>
                Education Verification
                <Tooltip title='Confidence in education history validation'><img src={TooltipIcon}/></Tooltip>
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.scores?.education.score}%<span className='light-label'>(Weight: 20%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.scores?.education.score}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: scoreColor(candidate.scores?.education.score),
                  },
                }}
              />
            </div>
            <Divider style={{padding: '5px 0px'}}/>
            <div className='section-info'>
              <div className='score-row'>Confidence Indicators</div>
              <div style={{display: 'flex'}}>
                <div style={{display: 'grid', width: '100%', gap: '5px'}} className='light-label'>
                  <span><div className={`status-badge high`}></div>High (80-100%): Strong data correlation</span>
                  <span><div className={`status-badge medium`}></div>Medium (50-79%): Moderate confidence</span>
                </div>
                <div style={{display: 'grid', width: '100%', gap: '5px'}} className='light-label'>
                  <span><div className={`status-badge low`}></div>Low (30-49%): Limited data available</span>
                  <span><div className={`status-badge very-low`}></div>Very Low (0-29%): Insufficient data</span>
                </div>
              </div>
            </div>
          </div>
          <div className='contact-section'>
            <div className='section-title'>Personality Insights</div>
            <div className='section-info'>
              <div className='light-label'>{candidate.personality_insights?.summary}</div>
            </div>
            <div className='insight-card-container'>
              <div className='contact-section' style={{width: '100%'}}>
                <div className='score-label'>
                  <img src={SkillsIcon}/>Personality Traits
                </div>
                {candidate.personality_insights?.traits.map((trait) => (
                  <div className='section-info'>
                    <div className='score-row'>
                      {trait.name}
                      <Rating sx={{marginLeft: 'auto', color: '#0A66C2'}} value={(trait.score / 20)} size='small' readOnly precision={0.5}/>
                    </div>
                    <LinearProgress
                      id='score-bar' 
                      variant="determinate" 
                      value={candidate.scores?.skills.score}
                      sx={{
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: "#0A66C2",
                        },
                      }}
                    />
                    <div className='light-label'>{trait.description}</div>
                  </div>
                ))}
              </div>
              <div className='contact-section' style={{width: '100%'}}>
                <div className='score-label'>
                  <img src={PeopleIcon}/>Communication Style
                </div>
                {candidate.personality_insights?.communication_style.map((style) => (
                  <div className='section-info'>
                    <div className='score-row'>
                      {style.name}
                      <Rating sx={{marginLeft: 'auto', color: '#0A66C2'}} value={(style.score / 20)} size='small' readOnly precision={0.5}/>
                    </div>
                    <LinearProgress
                      id='score-bar' 
                      variant="determinate" 
                      value={candidate.scores?.skills.score}
                      sx={{
                        "& .MuiLinearProgress-bar": {
                          backgroundColor: "#0A66C2",
                        },
                      }}
                    />
                    <div className='light-label'>{style.description}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className='insight-card-container'>
              <div className='contact-section' style={{width: '100%'}}>
                <div className='section-info'>
                  <div className='score-row'>Work Preferences</div>
                  <div>
                    {candidate.personality_insights?.work_preferences.map((pref) => (
                      <li className='light-label'>{pref}</li>
                    ))}
                  </div>
                </div>
              </div>
              <div className='contact-section' style={{width: '100%'}}>
                <div className='section-info'>
                  <div className='score-row'>Key Strengths</div>
                  <div>
                    {candidate.personality_insights?.strengths.map((strength) => (
                      <li className='light-label'>{strength}</li>
                    ))}
                  </div>
                </div>                
              </div>
              <div className='contact-section' style={{width: '100%'}}>
                <div className='section-info'>
                  <div className='score-row'>Growth Areas</div>
                  <div>
                    {candidate.personality_insights?.areas_for_growth.map((area) => (
                      <li className='light-label'>{area}</li>
                    ))}
                  </div>
                </div>                
              </div>
            </div>
          </div>
          <div className='contact-section'>
            <div className="tab-container-section">
              {tabs.map((tab, index) => (
                <button
                  key={index}
                  className={`tab-button ${activeTab === index ? "selected" : ""}`}
                  onClick={() => setActiveTab(index)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {activeTab === 0 ?
            <div className='section-info'>
              <div className='section-label'>Name: <span style={{fontWeight: 400}}>{capitalizeFirstLetter(candidate.contact?.name)}</span></div>
              <div className='section-label'>Email: <a href={`mailto:${email}?subject=${emailSubject}&body=${emailBody}`} className='linkedin-link'>{email}</a></div>
              <div className='section-label'>Phone: <span style={{fontWeight: 400}}>{candidate.contact?.phone}</span></div>
              <div className='section-label'>Location: <span style={{fontWeight: 400}}>{capitalizeFirstLetter(candidate.contact?.location)}</span></div>
              <div className='section-label'>LinkedIn: <a 
                  onClick={() => handleRedirectToLinkedIn(candidate.contact?.linkedin)} 
                  className='linkedin-link' 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {capitalizeFirstLetter(candidate.contact?.name)}
                </a>
              </div>
            </div> :
            activeTab === 1 && candidate.work_experience.length > 0 ?
            candidate.work_experience?.map((experience) => (
              <div className='section-label'>
                <div>{experience.title}</div>
                <div style={{fontWeight: 400, marginTop: 8}}>{experience.company}</div>
                <div style={{fontWeight: 400, color: '#929292'}}>{experience.duration}</div>
                {experience.highlights?.map((highlight) => (
                  <ul style={{fontWeight: 400, margin: 6, paddingLeft: 20}}>
                    <li>{highlight}</li>
                  </ul>
                ))}
              </div>
            )) :
            activeTab === 2 && candidate.education.length > 0 ?
            candidate.education?.map((educ) => (
              <div className='section-label'>
                <div>{educ.degree}</div>
                <div className='light-label' style={{fontWeight: 400}}>
                  {educ.institution || 'Institution not provided'} • <span>{educ.year}</span>
                </div>
              </div>
            )) : 
            activeTab === 3 && candidate.certifications.length > 0 ?
            candidate.certifications?.map((cert) => (
              <div className='section-label'>• {cert}</div>
            )) :
            activeTab === 4 && candidate.projects.length > 0 ?
            candidate.projects?.map((project) => (
              <div className='section-label'>
                <div>{project.name}</div>
                <div style={{fontWeight: 400}}>{project.description}</div>
                {project.technologies?.map((tech) => (
                  <div className='light-label'> • {tech}</div>
                ))}
              </div>
            )) :
            <div className='light-label'>No {tabs[activeTab]} found.</div>
            }
          </div>
        </div>
        <div className='candidate-modal-row1'>
          <button 
            disabled={!isEditable && candidate.status == "Selected"}
            className='send-button' 
            onClick={handleEditOrReject}
          >
            {isEditable ? `${showSelectStatus ? 'Cancel' : 'Edit Candidate'}` : 'Reject Candidate'}
          </button>
          <button 
            disabled={saving}
            className='view-button' 
            onClick={handleViewOrSaveChanges}
          >
            {showSelectStatus ? `${saving ? 'Saving Changes...' : 'Save All Changes'}` : 'View Profile' }
          </button>
          <Tooltip title={isEditable ? 'Delete' : 'Interested'} arrow placement='top'>
            {status != "Selected" && 
            <img 
              className={`save-icon ${loadSaveButton ? 'disabled' : ''}`} 
              onClick={handleIconClick} 
              src={isEditable ? DeleteIcon : Bookmark} 
              alt="Bookmark" />}
          </Tooltip>
        </div>
        <ConfirmModal
          open={showConfirm}
          close={() => setShowConfirm(false)}
          delete={() => deleteCandidate(candidate.id)}
          item={"candidate"}
          loading={confirming}
        />
        <IntroEmailModal 
          open={showGeneratedEmail} 
          close={() => setShowGeneratedEmail(false)} 
          candidate={candidate} 
          jobTitle={candidate.jobTitle}
          userInfo={userInfo}
          hiringCompany={candidate.company}
          emailSubject={setEmailSubject}
          emailBody={setEmailBody}
        />
        <InterviewPrepModal
          open={showInterviewPrep} 
          close={() => setShowInterviewPrep(false)} 
          prepData={prepData}
        />
      </div>
    </Modal>
  );
};

export default CandidateDetailsModal;