import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import './QuestionnairesPage.css';
import { Select, MenuItem, Tooltip, Snackbar, Alert, Slide } from "@mui/material";
import { SearchIcon, EditIcon, Delete, TooltipIcon, Link } from "../../assets/images";
import { fetchPaginatedQuestionnaires, searchQuestionnaires, deleteQuestionnaire } from "../../utils/firebaseService";
import { formatTimestamp } from "../../utils/helper";
import CircularLoading from "../../components/circularLoading/CircularLoading";
import ConfirmModal from "../../components/confirmModal/ConfirmModal";

const QuestionnairesPage = (props) => {
  const userId = props.userId;
  const userInfo = props.userInfo;
  const tableHeader = ["Job", "Company", "Version", "Date", "Actions"];
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
      <div className="candidates card">
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
                  <td>{questionnaire.data?.version}</td>
                  <td>{formatTimestamp(questionnaire.data?.timestamp)}</td>
                  <td className="action-column">
                    <Tooltip title="Edit">
                      <img onClick={() => handleEditQuestionnaire(questionnaire.id)} src={EditIcon} alt="Edit" />
                    </Tooltip>
                    <Tooltip title="Delete">
                      <img onClick={() => handleShowConfirmation(questionnaire.id)}  src={Delete} alt="Delete" />
                    </Tooltip>
                    <Tooltip title="Link">
                      <img onClick={() => handleCopyLink(questionnaire.data?.link)} src={Link} alt="Link" />
                    </Tooltip>
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
    </div>
  );
};

export default QuestionnairesPage;