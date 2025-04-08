import React, { useEffect, useState } from 'react';
import "./CandidateDetailsModal.css";
import { Modal, Select, CircularProgress, LinearProgress, Tooltip, MenuItem, Rating, Divider } from '@mui/material';
import { Close, Bookmark, DeleteIcon, InterviewIcon, EmailIcon, SkillsIcon, ExperienceIcon, EducationIcon, DatabaseIcon, PeopleIcon, TooltipIcon, FileIcon, ShowPassword, LocationIcon, StackDollar, BuildingIcon, CalendarIcon, IndustryIcon, CircleX, CircleCheck, CircleCheckMini, SquareCheckMini, CheckMini, XMini, Dumbbell, HandDroplet, School, Book, Crown } from '../../assets/images';
import { capitalizeFirstLetter, handleRedirectToLinkedIn, scoreColor } from '../../utils/utils';
import ConfirmModal from '../confirmModal/ConfirmModal';
import { db } from '../../firebaseConfig';
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import ScoreGauge from '../scoreGauge/ScoreGauge';
import IntroEmailModal from '../introEmailModal/IntroEmailModal';
import InterviewPrepModal from '../interviewPrepModal/InterviewPrepModal';
import { apiBaseUrl } from '../../utils/constants';
import { getPercentageDifference } from '../../utils/helper';

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
  const handleGenerateLink = props.handleGenerateLink;
  const generating = props.generating;
  const email = candidate.contact?.email?.toLowerCase();
  const questionnaireLink = props.questionnaireLink;

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
  const [includeLink, setIncludeLink] = useState(false);

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
          {/* <div className='contact-section'>
            <div className='section-title'>Detailed Scores</div>
            <div className='score-row' style={{marginBottom: 20, gap: 25}}>
            <div><span className='light-label'>Overall Match: </span><span>{Math.round(candidate.scores?.overall)}%</span></div>
            <div><span className='light-label'>Job Match: </span><span>{candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)}%</span></div>
              <div><span className='light-label'>Skills Match: </span><span>{candidate.jobMatchScore.tagScore.finalScore}%</span></div>
            </div>
            <div className='metric-section'>
              <ScoreGauge title={"Overall Match"} value={Math.round(candidate.scores?.overall)}/>
              <ScoreGauge title={"Job Match"} value={candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)}/>
              <div className='action-button-container'>
                {isEditable && 
                <button onClick={() => handleGenerateLink(candidate)} disabled={generating} className='action-button'>
                  {generating ? 
                    <>
                      <CircularProgress thickness={5} size={10} color='black'/>Generating...
                    </> : 
                    <>
                      <img width={16} height={16} src={candidate.questionnaireData?.isAnswered ? ShowPassword : FileIcon}/>
                      {candidate.questionnaireData?.isAnswered ? 'View Assesment' : 'Generate Questionnaire Link'}
                    </>
                  }
                </button>}
                <div style={{display: 'flex', gap: 8}}>
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
                {isEditable &&
                <div className='checkbox-container'>
                  <Tooltip title={!questionnaireLink && 'Generate questionnaire link to enable'}>
                    <input 
                      disabled={!questionnaireLink}
                      className='input-checkbox' 
                      type="checkbox"
                      checked={includeLink}
                      onChange={(e) => setIncludeLink(e.target.checked)}
                    />
                  </Tooltip>
                  <span>Include questionnaire link in email template</span>
                </div>}
              </div>
            </div>
          </div> */}
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
            <div className='flex'>
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
              </div>
              <div className='action-button-container'>
                {isEditable && 
                <button onClick={() => handleGenerateLink(candidate)} disabled={generating} className='action-button'>
                  {generating ? 
                    <>
                      <CircularProgress thickness={5} size={10} color='black'/>Generating...
                    </> : 
                    <>
                      <img width={16} height={16} src={candidate.questionnaireData?.isAnswered ? ShowPassword : FileIcon}/>
                      {candidate.questionnaireData?.isAnswered ? 'View Assesment' : 'Generate Questionnaire Link'}
                    </>
                  }
                </button>}
                <div style={{display: 'flex', gap: 8}}>
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
                {isEditable &&
                <div className='checkbox-container'>
                  <Tooltip title={!questionnaireLink && 'Generate questionnaire link to enable'}>
                    <input 
                      disabled={!questionnaireLink}
                      className='input-checkbox' 
                      type="checkbox"
                      checked={includeLink}
                      onChange={(e) => setIncludeLink(e.target.checked)}
                    />
                  </Tooltip>
                  <span>Include questionnaire link in email template</span>
                </div>}
              </div>
            </div> :
            activeTab === 1 && candidate.contact.work_experience.length > 0 ?
            candidate.contact.work_experience?.map((experience) => (
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
            activeTab === 2 && candidate.contact.education.length > 0 ?
            candidate.contact.education?.map((educ) => (
              <div className='section-label'>
                <div>{educ.degree}</div>
                <div className='light-label' style={{fontWeight: 400}}>
                  {educ.institution || 'Institution not provided'} • <span>{educ.year}</span>
                </div>
              </div>
            )) : 
            activeTab === 3 && candidate.contact.certifications.length > 0 ?
            candidate.contact.certifications?.map((cert) => (
              <div className='section-label'>• {cert}</div>
            )) :
            activeTab === 4 && (candidate.contact.projects.length > 0 || candidate.contact.projects != 0) ?
            candidate.contact.projects?.map((project) => (
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
          <div className='contact-section'>
            <div>
              {/* <div className='section-title'>Match Analysis ({Math.round(candidate.scores?.overall)}%)</div> */}
              <div className='section-title'>Match Analysis</div>
              <div className='light-label'>Match assessment based on available data</div>
            </div>
            {/* <div style={{padding: '10px 0px'}}>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={Math.round(candidate.scores?.overall)}
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
            </div> */}
            <div className='section-info'>
              <div className='score-label'>
                <img src={SkillsIcon}/>Skills <Tooltip placement="right" title="Relevance and depth of skills compared to job requirements"><img src={TooltipIcon}/></Tooltip>
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)}%<span className='light-label'>(Weight: 50%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: scoreColor(candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)),
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-label'>
                <img src={LocationIcon}/>Location <Tooltip placement="right" title="Proximity to job location or flexibility for relocation/remote work"><img src={TooltipIcon}/></Tooltip>
                <span className='sub-label' style={{alignContent: 'center'}}>Lives {Math.round(candidate.jobMatchScore?.locationScore?.distanceKm || 0)} km from the job location</span>
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.jobMatchScore?.locationScore.finalScore}%<span className='light-label'>(Weight: 10%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.jobMatchScore?.locationScore.finalScore}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: scoreColor(candidate.jobMatchScore?.locationScore.finalScore),
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-label'>
                <img src={IndustryIcon}/>Industry <Tooltip placement="right" title="Relevance of the candidate's industry experience to the job's industry"><img src={TooltipIcon}/></Tooltip>
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.jobMatchScore?.industryScore.finalScore}%<span className='light-label'>(Weight: 10%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.jobMatchScore?.industryScore.finalScore}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: scoreColor(candidate.jobMatchScore?.industryScore.finalScore),
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-label'>
                <img src={School}/>Institution <Tooltip placement="right" title="Reputation and alignment of the candidate's education with the role"><img src={TooltipIcon}/></Tooltip>
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.jobMatchScore?.institutionScore.finalScore}%<span className='light-label'>(Weight: 10%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.jobMatchScore?.institutionScore.finalScore}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: scoreColor(candidate.jobMatchScore?.institutionScore.finalScore),
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-label'>
                <img src={StackDollar}/>Salary <Tooltip placement="right" title="Alignment between candidate's salary expectations and the role's budget"><img src={TooltipIcon}/></Tooltip>
                <span className='sub-label' style={{alignContent: 'center'}}>There is a {getPercentageDifference(candidate.jobMatchScore?.salaryScore.contactSalary, candidate.jobMatchScore?.salaryScore.jobSalary)}% discrepancy between the candidate's salary expectations and the offered salary</span>
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.jobMatchScore?.salaryScore.finalScore}%<span className='light-label'>(Weight: 10%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.jobMatchScore?.salaryScore.finalScore}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: scoreColor(candidate.jobMatchScore?.salaryScore.finalScore),
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-label'>
                <img style={{padding: '0 2.5px'}} src={BuildingIcon}/>Work Setup <Tooltip placement="right" title="Compatibility with the job's work arrangement (e.g., remote, hybrid, onsite)"><img src={TooltipIcon}/></Tooltip>
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.jobMatchScore?.workSetupScore.finalScore}%<span className='light-label'>(Weight: 5%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.jobMatchScore?.workSetupScore.finalScore}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: scoreColor(candidate.jobMatchScore?.workSetupScore.finalScore),
                  },
                }}
              />
            </div>
            <div className='section-info'>
              <div className='score-label'>
                <img src={CalendarIcon}/>Work Shift <Tooltip placement="right" title="Flexibility to accommodate the role's schedule (e.g., night shifts, weekends)"><img src={TooltipIcon}/></Tooltip>
                <span style={{marginLeft: 'auto'}} className='score-row'>{candidate.jobMatchScore?.workShiftScore.finalScore}%<span className='light-label'>(Weight: 5%)</span></span>
              </div>
              <LinearProgress
                id='score-bar' 
                variant="determinate" 
                value={candidate.jobMatchScore?.workShiftScore.finalScore}
                sx={{
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: scoreColor(candidate.jobMatchScore?.workShiftScore.finalScore),
                  },
                }}
              />
            </div>
            <Divider style={{padding: '5px 0px'}}/>
            <div className='section-info'>
              <div className='score-row'>Score Indicators</div>
              <div style={{display: 'flex'}}>
                <div className='tags-label light-label'>
                  <span><div className={`status-badge high`}></div>High (80-100%): Strong alignment with ideal criteria</span>
                  <span><div className={`status-badge medium`}></div>Medium (50-79%): Meets key requirements with minor gap</span>
                </div>
                <div className='tags-label light-label'>
                  <span><div className={`status-badge low`}></div>Low (30-49%): Partial match; further review recommended</span>
                  <span><div className={`status-badge very-low`}></div>Very Low (0-29%): Significant deviations or missing data</span>
                </div>
              </div>
            </div>
          </div>
          <div className='contact-section'>
            <div className='section-title'>Detailed Analysis</div>
            <div className='section-info'>
              <div className='light-label'>{candidate.detailedAnalysis?.fit_narrative}</div>
            </div>
            <div className='insight-card-container'>
              <div className='contact-section' style={{width: '100%'}}>
                <div className='score-label'>
                  <img src={CircleCheck}/>Matched Skills
                </div>
                {candidate.detailedAnalysis?.job_requirements_analysis.matched.length > 0 ?
                candidate.detailedAnalysis?.job_requirements_analysis.matched.map((skill) => (
                  <div style={{alignItems: 'start'}} className='score-label'>
                    <img style={{marginTop: 3}} src={CheckMini}/>
                    <div className='tag-label'>
                      <span>{capitalizeFirstLetter(skill.requirement)}: </span>
                      <span className='sub-label'>{skill.comment}</span>
                    </div>
                  </div>
                )) :
                <div className='light-label'>No skills found.</div>}
              </div>
              <div className='contact-section' style={{width: '100%'}}>
                <div className='score-label'>
                  <img src={CircleX}/>Missing Skills
                </div>
                {candidate.detailedAnalysis?.job_requirements_analysis.no_matched.length > 0 ?
                candidate.detailedAnalysis?.job_requirements_analysis.no_matched.map((skill) => (
                  <div style={{alignItems: 'start'}} className='score-label'>
                    <img style={{marginTop: 2}} src={XMini}/>
                    <div className='tag-label'>
                      <span>{capitalizeFirstLetter(skill.requirement)}: </span>
                      <span className='sub-label'>{skill.comment}</span>
                    </div>
                  </div>
                )) :
                <div className='light-label'>No skills found.</div>}
              </div>
            </div>
            <div className='insight-card-container'>
              <div className='contact-section' style={{width: '100%'}}>
                <div className='section-info'>
                  <div className='score-row'><img src={Dumbbell}/>Key Strengths</div>
                  <div className='light-label'>{candidate.detailedAnalysis?.summary.strengths}</div>
                </div>
              </div>
              <div className='contact-section' style={{width: '100%'}}>
                <div className='section-info'>
                  <div className='score-row'><img src={HandDroplet}/>Growth Areas</div>
                  <div className='light-label'>{candidate.detailedAnalysis?.summary.weaknesses}</div>
                </div>                
              </div>
            </div>
            <div className='insight-card-container'>
              <div className='contact-section' style={{width: '100%'}}>
                <div className='section-info'>
                  <div className='score-row'>
                    <img src={Crown}/>Professional Commitment: 
                    <span style={{fontWeight: 600}} className='sub-label'>({candidate.detailedAnalysis?.job_requirements_analysis.commitment.year}+ years)</span>
                  </div>
                  <div className='light-label'>{candidate.detailedAnalysis?.job_requirements_analysis.commitment.details}</div>
                </div>
              </div>
              <div className='contact-section' style={{width: '100%'}}>
                <div className='section-info'>
                  <div className='score-row'><img src={Book}/>Recommendation</div>
                  <div className='light-label'>{candidate.detailedAnalysis?.recommendation}</div>
                </div>                
              </div>
            </div>
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
          includeLink={includeLink}
          questionnaireLink={questionnaireLink}
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