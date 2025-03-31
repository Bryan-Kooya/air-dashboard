import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import './QuestionnairesPage.css';
import { doc, updateDoc, getDocs, collection, where, query, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { Select, MenuItem, Tooltip, Snackbar, Alert, Slide, CircularProgress } from "@mui/material";
import { SearchIcon, EditIcon, Delete, TooltipIcon, Link } from "../../assets/images";
import { fetchPaginatedQuestionnaires, searchQuestionnaires, deleteQuestionnaire } from "../../utils/firebaseService";
import { formatTimestamp } from "../../utils/helper";
import CircularLoading from "../../components/circularLoading/CircularLoading";
import ConfirmModal from "../../components/confirmModal/ConfirmModal";
import AddGeneralQuestionModal from "../../components/addGeneralQuestionModal/AddGeneralQuestionModal";
import { apiBaseUrl } from "../../utils/constants";

const QuestionnairesPage = (props) => {
  const userId = props.userId;
  const userInfo = props.userInfo;
  const tableHeader = ["Job", "Company", "Status", "Version", "Date", "Actions"];
  const sortOptions = ["Newest", "Oldest"];

  const [questionnaires, setQuestionnaires] = useState([]);
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(false);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [questionnairesCount, setQuestionnairesCount] = useState(0);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [messageType, setMessageType] = useState("");
  const [sortedBy, setSortedBy] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [jobId, setJobId] = useState("");
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [questionData, setQuestionData] = useState({
    jobTitle: "",
    company: "",
    question: "",
    difficulty: "",
    skillCategory: "",
    options: null,
    answer: "",
    explanation: "",
  });

  const observer = useRef();
  const navigate = useNavigate()
  const pageSize = 10;

  const lastQuestionnaireElementRef = useCallback(node => {
    if (loadingQuestionnaires) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreQuestionnaires();
      }
    }, { threshold: 0.5 });

    if (node) observer.current.observe(node);
  }, [loadingQuestionnaires, hasMore]);

  const loadQuestionnaires = async () => {
    try {
      const { data, lastVisible: last, total } = await fetchPaginatedQuestionnaires(pageSize, null, userId);
      setQuestionnaires(data);
      setLastVisible(last);
      setHasMore(data.length < total);
      setQuestionnairesCount(total);
    } catch (error) {
      console.error("Error fetching questionnaires:", error);
      updateMessage("An error occurred while loading job", "error", true);
    }
  };

  const loadMoreQuestionnaires = async () => {
    if (!hasMore || loadingQuestionnaires) return;
    
    setLoadingQuestionnaires(true);
    try {
      const { data, lastVisible: last, total } = await fetchPaginatedQuestionnaires(
        pageSize,
        lastVisible,
        userId
      );
      
      if (data.length > 0) {
        setQuestionnaires([...questionnaires, ...data]);
        setLastVisible(last);
        setHasMore(questionnaires.length + data.length < total);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more questionnaires:", error);
      updateMessage("An error occurred while loading more questionnaires", "error", true);
    } finally {
      setLoadingQuestionnaires(false);
    }
  };

  const searchAndloadQuestionnaires = async () => {
    if (!searchQuery) {
      setQuestionnaires([]);
      setLastVisible(null);
      setHasMore(true);
      await loadQuestionnaires();
      return;
    }
    try {
      setLoadingQuestionnaires(true);
      const data = await searchQuestionnaires(searchQuery, userId);
      setQuestionnaires(data);
      setHasMore(false);
    } catch (error) {
      console.error("Error searching questionnaires:", error);
      updateMessage("An error occurred while deleting job", "error", true);
    } finally {
      setLoadingQuestionnaires(false);
    }
  };

  const handleSortedBy = (sortOption) => {
    setSortedBy(sortOption);
  
    const sortedQuestionnaires = [...questionnaires].sort((a, b) => {
      const dateA = a.timestamp;
      const dateB = b.timestamp;
  
      if (sortOption === "Newest") {
        return dateB - dateA; // Sort by descending date
      }
      if (sortOption === "Oldest") {
        return dateA - dateB; // Sort by ascending date
      }
      return 0;
    });
  
    setQuestionnaires(sortedQuestionnaires);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    await searchAndloadQuestionnaires();
  };

  const handleGenerateLink = async (job) => {
    await generateLink(job);
    setTimeout(() => {
      updateMessage("Questionnaire's link has been copied to clipboard.", "success", true);
    }, 800);
  };

  const generateLink = async (job) => {
    setGenerating(true);
    try {
      if (job.data && job.data.questions.length > 0) {
        navigator.clipboard.writeText(job.data.link);
        console.log("Using existing questionnaire data link.");
      } else {
        const response = await fetch(`${apiBaseUrl}/generate-questionnaire`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobTitle: job.job_title,
            jobDescription: job.description,
            jobId: job.id,
            language: job.language,
          }),
        });
  
        if (!response.ok) {
          throw new Error(await response.text());
        }
  
        const data = await response.json();
  
        // Add a timestamp to the questionnaireData
        const questionnaireDataWithTimestamp = {
          ...data,
          version: "System",
          timestamp: serverTimestamp(),
        };
  
        // Update the job document in Firestore with the new questionnaireData
        const jobDoc = doc(db, "jobs", job.id);
        await updateDoc(jobDoc, { questionnaireData: questionnaireDataWithTimestamp });
  
        // Update the local state with the new questionnaireData
        setQuestionnaires((prevJobs) =>
          prevJobs.map((j) =>
            j.id === job.id
              ? { ...j, data: questionnaireDataWithTimestamp } // Update the specific job
              : j // Keep other jobs unchanged
          )
        );
  
        // Copy the link to the clipboard
        navigator.clipboard.writeText(data.link);
        updateMessage("Questionnaire link has been copied to clipboard.", "success", true);
      }
    } catch (error) {
      console.error("Error generating questionnaire data:", error);
      updateMessage("Failed to generate questionnaire data. Please try again later.", "error", true);
    } finally {
      setTimeout(() => setGenerating(false), 500);
    }
  };

  const handleCopyLink = (link) => {
    navigator.clipboard.writeText(link);
    updateMessage("Questionnaire's link has been copied to clipboard.", "success", true);
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const updateMessage = (value, type, isOpen) => {
    setMessage(value);
    setMessageType(type);
    if (isOpen && !open) {
      setOpen(true); // Only set open to true if it's not already open
    }
  };

  const handleEditQuestionnaire = (jobId) => {
    navigate(`/questionnaire/${jobId}`, {
      state: { isEdit: true },
    });
  };

  const handleShowConfirmation = (id) => {
    setShowConfirmation(true);
    setJobId(id);
  };

  const handleDeleteQuestionnaire = async () => {
    setConfirming(true);
    try {
      await deleteQuestionnaire(jobId);
      await loadQuestionnaires();
      setTimeout(() => setConfirming(false), 300);
      setTimeout(() => setShowConfirmation(false), 500);
      updateMessage("Questionnaire data deleted successfully", "success", true);
    } catch (error) {
      console.error("Error deleting questionnaire data:", error);
      setTimeout(() => setConfirming(false), 300);
      setTimeout(() => setShowConfirmation(false), 500);
      updateMessage("Failed to delete questionnaire data", "error", true);
    }
  };

  const handleAddInputChange = (e) => {
    const { name, value } = e.target;
    setQuestionData((prev) => ({ ...prev, [name]: name === "options" ? value.split(",") : value }));
  };

  const handleAddQuestion = async () => {
    // Validate required fields
    if (
      !questionData.question ||
      (questionData.skillCategory !== "General" && !questionData.answer) ||
      (questionData.skillCategory === "Technical" && !questionData.jobTitle)
    ) {
      updateMessage("Please fill in all required fields", "warning", true);
      return;
    }
  
    try {
      setLoading(true);
  
      // Create the new question object
      const newQuestion = {
        question: questionData.question,
        difficulty: questionData.difficulty,
        skillCategory: questionData.skillCategory,
        options: questionData.options,
        answer: questionData.answer,
        explanation: questionData.explanation,
      };
  
      // Get a reference to the Firestore collection
      const jobsCollectionRef = collection(db, "jobs");
  
      // Query jobs based on the userId (assuming you have a userId field in the job documents)
      const jobsQuery = query(jobsCollectionRef, where("userId", "==", userId));
      const jobsSnapshot = await getDocs(jobsQuery);
  
      // Initialize Firestore batch for bulk updates
      const batch = writeBatch(db);
  
      // Iterate through the jobs and update them based on the conditions
      jobsSnapshot.forEach((jobDoc) => {
        const jobData = jobDoc.data();
  
        // Determine if the job matches the conditions
        const isGeneral = questionData.skillCategory === "General";
        const isTechnical = questionData.skillCategory === "Technical";
        const isJobTitleMatch = questionData.jobTitle && jobData.job_title === questionData.jobTitle;
        const isCompanyMatch = questionData.company && jobData.company_name === questionData.company;
  
        // Condition 1: General skillCategory, no jobTitle or company
        if (isGeneral && !questionData.jobTitle && !questionData.company) {
          // Add the question to all jobs
          addQuestionToJob(batch, jobDoc, newQuestion);
        }
        // Condition 2: General skillCategory, jobTitle provided, no company
        else if (isGeneral && questionData.jobTitle && !questionData.company && isJobTitleMatch) {
          // Add the question to jobs with matching jobTitle
          addQuestionToJob(batch, jobDoc, newQuestion);
        }
        // Condition 3: General skillCategory, jobTitle and company provided
        else if (isGeneral && questionData.jobTitle && questionData.company && isJobTitleMatch && isCompanyMatch) {
          // Add the question to jobs with matching jobTitle and company
          addQuestionToJob(batch, jobDoc, newQuestion);
        }
        // Condition 4: Technical skillCategory, jobTitle provided, no company
        else if (isTechnical && questionData.jobTitle && !questionData.company && isJobTitleMatch) {
          // Add the question to jobs with matching jobTitle
          addQuestionToJob(batch, jobDoc, newQuestion);
        }
        // Condition 5: Technical skillCategory, jobTitle and company provided
        else if (isTechnical && questionData.jobTitle && questionData.company && isJobTitleMatch && isCompanyMatch) {
          // Add the question to jobs with matching jobTitle and company
          addQuestionToJob(batch, jobDoc, newQuestion);
        }
      });
  
      // Commit the batch updates
      await batch.commit();
  
      // Reset the form and update UI
      setQuestionData({
        jobTitle: "",
        company: "",
        question: "",
        difficulty: "",
        skillCategory: "",
        options: null,
        answer: "",
        explanation: "",
      });
  
      setTimeout(() => setLoading(false), 300);
      setTimeout(() => setAddModalOpen(false), 500);
      updateMessage("Question added successfully", "success", true);
    } catch (error) {
      console.error("Error adding question:", error);
      setLoading(false);
      updateMessage("Failed to add question", "error", true);
    }
  };
  
  // Helper function to add a question to a job
  const addQuestionToJob = (batch, jobDoc, newQuestion) => {
    const jobData = jobDoc.data();
  
    // Get the existing questionnaireData (if it exists)
    const existingQuestionnaireData = jobData.questionnaireData || { questions: [] };
  
    // Append the new question to the existing questions array
    const updatedQuestions = [...existingQuestionnaireData.questions, newQuestion];
  
    // Create the updated questionnaire data
    const updatedQuestionnaireData = {
      ...existingQuestionnaireData, // Preserve other fields
      version: "Customized",
      questions: updatedQuestions, // Update the questions array
      timestamp: serverTimestamp(), // Update the timestamp
    };
  
    // Add the update to the batch
    batch.update(jobDoc.ref, {
      questionnaireData: updatedQuestionnaireData,
    });
  };

  // Watch for changes in searchQuery
  useEffect(() => {
    if (searchQuery === "" || searchQuery.length >= 3) {
      handleSearchSubmit({ preventDefault: () => {} }); // Simulate form submission
    }
  }, [searchQuery]);

  // Load questionnaires on component mount
  useEffect(() => {
    loadQuestionnaires();
  }, []);

  (function setHeaderTitle() {
    props.title("Questionnaires");
    props.subtitle("Centralized page to view and manage all questionnaires");
  })();

  return (
    <div className="questionnaires-container">
      <div style={{minHeight: 200}} className="candidates card">
        <div className="title-container">
          <div className="card-title">All Questionnaires ({questionnairesCount})</div>
          <div className="flex">
            <Select
              id="select-input"
              sx={{ width: 100 }}
              displayEmpty
              value={sortedBy}
              onChange={(e) => handleSortedBy(e.target.value)}
              renderValue={() => (sortedBy ? sortedBy : "Sort by")}
            >
              {sortOptions.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
            <form className="search-container" onSubmit={handleSearchSubmit}>
              <div className="search-wrapper">
                <img src={SearchIcon} alt="Search Icon" className="search-icon" onClick={handleSearchSubmit} />
                <input
                  className="search-input"
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button className="search primary-button" type="submit">
                Search
              </button>
            </form>
          </div>
        </div>
        <button 
          onClick={() => setAddModalOpen(true)} 
          style={{marginLeft: 'auto', width: 'max-content'}} 
          className="primary-button"
        >
          Add Question
        </button>
        <table className="candidates-table">
          <thead>
            <tr>
              {tableHeader.map((header, index) => (
                <th key={index}>
                  {header}
                  {header === 'Date' && 
                  <Tooltip title='Indicates when the questionnaire was created or last modified.'>
                    <img style={{position: 'absolute', marginLeft: 4}} src={TooltipIcon}/>
                  </Tooltip>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {questionnaires.length > 0 ? (
              questionnaires.map((questionnaire, index) => (
                <tr
                  key={questionnaire.id}
                  ref={index === questionnaires.length - 1 ? lastQuestionnaireElementRef : null}
                >
                  <td>{questionnaire.job_title}</td>
                  <td>{questionnaire.company_name}</td>
                  <td className={`status-color ${questionnaire.data?.questions.length > 0 ? 'passed' : 'failed'}`}>
                    {questionnaire.data?.questions.length > 0 ? "Generated" : "Not Generated"}
                  </td>
                  <td>{questionnaire.data?.version}</td>
                  <td>{formatTimestamp(questionnaire.data?.timestamp)}</td>
                  <td className="action-column">
                    <Tooltip title="Edit">
                      <img onClick={() => handleEditQuestionnaire(questionnaire.id)} src={EditIcon} alt="Edit" />
                    </Tooltip>
                    <Tooltip title="Delete">
                      <img onClick={() => handleShowConfirmation(questionnaire.id)}  src={Delete} alt="Delete" />
                    </Tooltip>
                    {generating ?
                    <CircularProgress thickness={5} size={16} color='#0a66c2'/> :
                    <Tooltip title="Link">
                      <img onClick={() => handleGenerateLink(questionnaire)} src={Link} alt="Link" />
                    </Tooltip>
                    }
                    
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={{maxWidth: "100%"}} colSpan={tableHeader.length} className="no-data">
                  No questionnaires available
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loadingQuestionnaires && <CircularLoading/>}
      </div>
      <Snackbar
        autoHideDuration={5000}
        open={open}
        onClose={handleClose}
        TransitionComponent={Slide} // Use Slide transition
        TransitionProps={{ direction: "up" }} // Specify the slide direction
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }} // Position the Snackbar
      >
        <Alert sx={{alignItems: 'center', "& .MuiAlert-action": {padding: '0px 0px 0px 6px'}, "& .MuiButtonBase-root": {width: '36px'}}} onClose={handleClose} severity={messageType}>
          {message}
        </Alert>
      </Snackbar>
      <ConfirmModal
        open={showConfirmation}
        close={() => setShowConfirmation(false)}
        delete={handleDeleteQuestionnaire}
        item={"questionnaire"}
        loading={confirming}
      />
      <AddGeneralQuestionModal
        open={isAddModalOpen}
        close={() => setAddModalOpen(false)}
        loading={loading}
        question={questionData}
        handleAddInputChange={handleAddInputChange}
        userId={userId}
        handleAddQuestion={handleAddQuestion}
      />
    </div>
  );
};

export default QuestionnairesPage;