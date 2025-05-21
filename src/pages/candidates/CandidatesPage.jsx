import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./CandidatesPage.css";
import { Select, Menu, MenuItem, Snackbar, Alert, Slide, Tooltip, LinearProgress, Chip } from "@mui/material";
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import { db } from '../../firebaseConfig';
import { doc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";
import { fetchPaginatedCandidates, searchCandidates, fetchJobQuestionnaire, fetchPaginatedProcessedContacts, searchProcessedContacts, getTotalProcessedContacts } from "../../utils/firebaseService";
import { SearchIcon, FilterIcon, EyeIcon, ThumbsUpSolid, ThumbsDownSolid, Users, UsersGear, ThumbsUp, ThumbsDown, Question } from "../../assets/images";
import { capitalizeFirstLetter } from "../../utils/utils";
import { getStatus, areArraysEqual } from "../../utils/helper";
import CircularLoading from "../../components/circularLoading/CircularLoading";

const CandidatesPage = (props) => {
  const tableHeader = [
    [ "Name", "Status", "Job", "Company", "Location", "Score", "Actions" ],
    [ "Accuracy", "Name", "Status", "Score", "Job", "Company", "Actions" ],
  ];
  const sortOptions = ["Newest", "Oldest"];
  const userId = props.userId;
  const userInfo = props.userInfo;
  const pageSize = 10;
  const observer = useRef();
  const navigate = useNavigate()

  // State Management
  const [viewDetails, setViewDetails] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState({});
  const [candidates, setCandidates] = useState([]);
  const [processedCandidates, setProcessedCandidates] = useState([]);
  const [candidatesCount, setCandidatesCount] = useState(0);
  const [matchedCandidatesCount, setMatchedCandidatesCount] = useState(0);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortedBy, setSortedBy] = useState("");
  const [filterBy, setFilterBy] = useState("");
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [messageType, setMessageType] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [questionnaireLink, setQuestionnaireLink] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const tabs = [
    { name: "Selected", icon: Users, count: candidatesCount }, 
    { name: "Matched", icon: UsersGear, count: matchedCandidatesCount }
  ];
  const filterOptions = activeTab === 1 ? ["Accurate", "Inaccurate", "No Feedback"] : ["Job", "Status", "Experience"];
  const statusOrder = {
    'Selected': 1,
    'Pending': 2,
    'Rejected': 3,
    'Irrelevant': 4,
    'Waiting for approval': 5,
    'Interviewed': 6,
    'Salary draft': 7
  };

  const lastCandidateElementRef = useCallback(node => {
    if (loadingMessages) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreCandidates();
      }
    }, { threshold: 0.5 });

    if (node) observer.current.observe(node);
  }, [loadingMessages, hasMore, filterBy]);

  const loadCandidates = async () => {
    try {
      const fetchFunction = activeTab === 0 
        ? fetchPaginatedCandidates 
        : fetchPaginatedProcessedContacts;
  
      const { data, lastVisible: last, total } = await fetchFunction(
        pageSize, 
        null, 
        userId
      );
  
      // Apply default sorting for Matched tab
      if (activeTab === 1) {
        const sortedData = data.sort((a, b) => {
          return statusOrder[a.status] - statusOrder[b.status];
        });
        setCandidates(sortedData);
        setFilteredCandidates(sortedData);
      } else {
        setCandidates(data);
        setFilteredCandidates(data);
      }
  
      setLastVisible(last);
      setHasMore(data.length < total);
      
      if (activeTab === 0) {
        setCandidatesCount(total);
      } else {
        setMatchedCandidatesCount(total);
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
      updateMessage("Error loading candidates", "error", true);
    }
  };  

  const loadMoreCandidates = async () => {
    if (!hasMore || loadingMessages) return;
    
    setLoadingMessages(true);
    try {
      const fetchFunction = activeTab === 0
        ? fetchPaginatedCandidates
        : fetchPaginatedProcessedContacts;
  
      const { data, lastVisible: last, total } = await fetchFunction(
        pageSize,
        lastVisible,
        userId
      );
  
      if (data.length > 0) {
        setCandidates(prev => [...prev, ...data]);
        const newlyFiltered = data.filter(candidate => {
          if (filterBy === "Accurate") return candidate.accurateScore === true;
          if (filterBy === "Inaccurate") return candidate.accurateScore === false;
          if (filterBy === "No Feedback") return candidate.accurateScore === undefined;
          return true;
        });
        setFilteredCandidates(prev => [...prev, ...newlyFiltered]);
        setLastVisible(last);
        setHasMore(candidates.length + data.length < total);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error loading more candidates:", error);
      updateMessage("Error loading more candidates", "error", true);
    } finally {
      setLoadingMessages(false);
    }
  };

  const searchAndLoadCandidates = async () => {
    if (!searchQuery) {
      setCandidates([]);
      setFilteredCandidates([]);
      setLastVisible(null);
      setHasMore(true);
      await loadCandidates();
      return;
    }
    try {
      setLoadingMessages(true);
      let data;
      
      if (activeTab === 0) {
        data = await searchCandidates(searchQuery, userId);
      } else {
        data = await searchProcessedContacts(searchQuery, userId);
      }
  
      setCandidates(data);
      setFilteredCandidates(data);
      setHasMore(false);
    } catch (error) {
      console.error("Error searching candidates:", error);
      updateMessage("Error searching candidates", "error", true);
    } finally {
      setLoadingMessages(false);
    }
  };

  const updateMessage = (value, type, isOpen) => {
    setMessage(value);
    setMessageType(type);
    if (isOpen && !open) {
      setOpen(true); // Only set open to true if it's not already open
    }
  };

  const handleUpdateChanges = async (candidate, status) => {
    try {
      if (!candidate?.id) {
        updateMessage("Candidate ID is missing. Unable to update status.", "error", true);
        return;
      }

    const contactsRef = collection(db, "contacts");
      const querySnapshot = await getDocs(
        query(
          contactsRef,
          where("name", "==", candidate.contact?.name),
          where("userId", "==", userId)
        )
      );

      if (!querySnapshot.empty) {
        const existingContactDoc = querySnapshot.docs[0];
        const existingContactRef = doc(db, "contacts", existingContactDoc.id);
        await updateDoc(existingContactRef, {
          status: status === "Irrelevant" ? "Irrelevant" : "Active",
          timestamp: serverTimestamp(),
        });
        console.log("Contact updated in Firestore:", existingContactDoc.id);
      }
  
      const candidateRef = doc(db, "candidates", candidate.id);
  
      // Update the status of the candidate
      await setDoc(
        candidateRef,
        { status: status },
        { merge: true } // Merge with existing fields to avoid overwriting
      );
  
      updateMessage("Candidate status updated successfully!", "success", true);
      await loadCandidates(); // Reload candidates to reflect the changes
    } catch (error) {
      console.error("Error updating candidate status:", error);
      updateMessage("An error occurred while updating candidate status.", "error", true);
    }
  };

  // Filter and sort candidates
  const applyFilterAndSort = (filter, sort) => {
    let updatedCandidates = [...candidates];
  
    // Apply filter
    if (filter) {
      if (activeTab === 1) {
        updatedCandidates = updatedCandidates.filter(candidate => {
          if (filter === "Accurate") return candidate.accurateScore === true;
          if (filter === "Inaccurate") return candidate.accurateScore === false;
          if (filter === "No Feedback") return candidate.accurateScore === undefined;
          else return true;
        });
      } else {
        // Original filter logic for other tabs
        updatedCandidates = updatedCandidates.sort((a, b) => {
          if (filter === "Job") return (a.job || "").localeCompare(b.job || "");
          if (filter === "Status") return (a.status || "").localeCompare(b.status || "");
          if (filter === "Experience") return (b.total_experience_years || 0) - (a.total_experience_years || 0);
          return 0;
        });
      }
    }
  
    // Apply sort
    if (activeTab === 1) {
      // Default sorting by status for Matched tab
      updatedCandidates = updatedCandidates.sort((a, b) => {
        return statusOrder[a.status] - statusOrder[b.status];
      });
    } else if (sort) {
      // Original sorting logic for other tabs
      updatedCandidates = updatedCandidates.sort((a, b) => {
        const dateA = a.timestamp ? a.timestamp.toDate() : new Date(0);
        const dateB = b.timestamp ? b.timestamp.toDate() : new Date(0);
        return sort === "Newest" ? dateB - dateA : dateA - dateB;
      });
    }
  
    setFilteredCandidates(updatedCandidates);
  };

  // Handlers
  const handleFilterMenuOpen = (event) => setFilterAnchorEl(event.currentTarget);

  const handleFilterMenuClose = () => setFilterAnchorEl(null);

  const handleFilterChange = (value) => {
    setFilterBy(value);
    applyFilterAndSort(value, sortedBy);
    setFilterAnchorEl(null);
  };

  const handleSortedBy = (value) => {
    setSortedBy(value);
    applyFilterAndSort(filterBy, value);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    await searchAndLoadCandidates();
  };

  const handleViewDetails = async (index, tabIndex) => {
    if (tabIndex === 0) {
      const {data} = await fetchJobQuestionnaire(filteredCandidates[index]?.jobId);
      setQuestionnaireLink(data?.link);
    }
    setSelectedCandidate(filteredCandidates[index]);
    setViewDetails(true);
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const handleGenerateLink = async (candidate) => {
    if (candidate.questionnaireData?.isAnswered) {
      navigate(`/questionnaire/${candidate.id}`);
    } else {
      updateMessage("The candidate has not yet completed the questionnaire.", "warning", true);
    }
  };

  const handleChangeTab = (index) => {
    setActiveTab(index);
    setSearchQuery("");
    setFilterBy("");
  };

  const getCandidateScore = (candidate) => {
    return candidate.jobMatchScore?.tagScore.finalScore > Math.round(candidate.scores?.skill_match.score) ? candidate.jobMatchScore?.tagScore.finalScore : Math.round(candidate.scores?.skill_match.score)
  };

  const handleAccurateScore = async (candidate, accurate) => {
    try {
      const contactsRef = collection(db, "contacts");
      const querySnapshot = await getDocs(
        query(
          contactsRef,
          where("name", "==", candidate.name),
          where("userId", "==", userId)
        )
      );
  
      if (querySnapshot.empty) {
        console.error("Contact not found.");
        return;
      }
  
      const contactDoc = querySnapshot.docs[0];
      const contactDocRef = contactDoc.ref;
      const existingJobs = contactDoc.data().jobs || [];
  
      const jobIndex = existingJobs.findIndex(
        (job) =>
          job.jobTitle === candidate.jobTitle &&
          job.company === candidate.company &&
          areArraysEqual(job.jobTags || [], candidate.jobTags)
      );
  
      if (jobIndex >= 0) {
        existingJobs[jobIndex].accurateScore = accurate;
        await updateDoc(contactDocRef, {
          jobs: existingJobs,
        });

        setCandidates(prev =>
          prev.map(c =>
            (c.name === candidate.name && c.jobTitle === candidate.jobTitle && c.company === candidate.jobTitle) ? { ...c, accurateScore: accurate } : c
          )
        );
        setFilteredCandidates(prev =>
          prev.map(c =>
            (c.name === candidate.name && c.jobTitle === candidate.jobTitle && c.company === candidate.jobTitle) ? { ...c, accurateScore: accurate } : c
          )
        );
        updateMessage(`Score marked as ${accurate ? 'accurate' : 'inaccurate'}!`, "success", true);
      } else {
        console.log("Job not found in contact's jobs.");
      }
    } catch (error) {
      console.error("Error updating accurateScore:", error);
      updateMessage("Failed to update score accuracy.", "error", true);
    }
  };

  // Watch for changes in searchQuery
  useEffect(() => {
    if (searchQuery === "" || searchQuery.length >= 3) {
      handleSearchSubmit({ preventDefault: () => {} }); // Simulate form submission
    }
  }, [searchQuery, activeTab]);

  (async function setHeaderTitle() {
    props.title("Candidates");
    props.subtitle("Centralized page to view and manage all candidates");
    const count = await getTotalProcessedContacts(userId);
    setMatchedCandidatesCount(count);
  })();

  return (
    <div className="candidates-container">
      <div className="candidates card">
        <div className="card-title">All Candidates</div>
        <div className="table-tab-container">
          {tabs.map((tab, index) => (
            <button className={`table-tab ${activeTab === index ? "active" : ""}`} onClick={() => handleChangeTab(index)}>
              <img className="menu-icon" src={tab.icon}/>
              <span>{tab.name}</span>
              <div className={`tab-count ${activeTab === index ? "active" : ""}`}>{tab.count}</div>
            </button>
          ))}
        </div>
        <div style={{marginLeft: 'auto'}}>
          <div className="flex">
            {activeTab === 1 && filterBy && <Chip id='tags' label={filterBy} onDelete={() => handleFilterChange("")}/>}
            <button onClick={handleFilterMenuOpen} className="filter-button">
              <img src={FilterIcon} alt="Filter" /> Filter
            </button>
            <Menu
              sx={{ marginTop: "4px" }}
              anchorEl={filterAnchorEl}
              open={Boolean(filterAnchorEl)}
              onClose={handleFilterMenuClose}
            >
              {filterOptions.map((option, index) => (
                <MenuItem key={index} onClick={() => handleFilterChange(option)}>
                  {option}
                </MenuItem>
              ))}
            </Menu>
            {activeTab === 0 &&
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
            </Select>}
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
              {tableHeader[activeTab].map((header, index) => (
                <th style={header === "Accuracy" ? {width: 1} : {}} key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.length > 0 ? (
              filteredCandidates.map((candidate, index) => {
                const isLastRow = index === filteredCandidates.length - 1;
                return (
                  activeTab === 0 ?
                  <tr 
                    key={index}
                    ref={isLastRow ? lastCandidateElementRef : null}
                  >
                    <td>{capitalizeFirstLetter(candidate.contact?.name)}</td>
                    <td>
                      <div className={`status-badge ${candidate.status?.toLowerCase().replace(/\s/g, "-")}`}></div>
                      {candidate.status}
                    </td>
                    <td>{candidate.jobTitle}</td>
                    <td>{candidate.company}</td>
                    <td>{candidate.location}</td>
                    <td className={`status-color ${getStatus(candidate.questionnaireData?.totalScore)}`}>
                      {candidate.questionnaireData?.totalScore || 'NA'}
                    </td>
                    <td className="action-column">
                      <Tooltip title='View assesment'>
                        <img 
                          width={16} height={16}
                          onClick={() => handleGenerateLink(candidate)} 
                          src={Question} 
                          alt={`View`} 
                        />
                      </Tooltip>
                      <Tooltip title="View Details">
                        <img onClick={() => handleViewDetails(index, activeTab)} src={EyeIcon} alt="View" />
                      </Tooltip>
                    </td>
                  </tr> :
                  <tr 
                    key={index}
                    ref={isLastRow ? lastCandidateElementRef : null}
                  >
                    <td style={{textAlign: 'center'}}>
                      <Tooltip title="Accurate">
                        <img
                          style={{marginRight: 16}} 
                          src={candidate.accurateScore ? ThumbsUpSolid : ThumbsUp}
                          onClick={() => handleAccurateScore(candidate, true)}
                        /> 
                      </Tooltip>
                      <Tooltip title="Inaccurate">
                        <img 
                          src={candidate.accurateScore === undefined || candidate.accurateScore ? ThumbsDown : ThumbsDownSolid}
                          onClick={() => handleAccurateScore(candidate, false)}
                        />
                      </Tooltip>
                    </td>
                    <td>{capitalizeFirstLetter(candidate.name)}</td>
                    <td>
                      <div className={`status-badge ${candidate.status?.toLowerCase().replace(/\s/g, "-")}`}></div>
                      {candidate.status}
                    </td>
                    <td>
                      <span>{getCandidateScore(candidate)}%</span>
                      <LinearProgress 
                        id='score-bar' 
                        variant="determinate" 
                        value={getCandidateScore(candidate)}
                        sx={{
                          "& .MuiLinearProgress-bar": {
                            backgroundColor: (getCandidateScore(candidate)) < 70 ? "#FFB20D" : "#22c55e",
                          },
                        }}
                      />
                    </td>
                    <td>{candidate.jobTitle}</td>
                    <td>{candidate.company}</td>
                    <td style={{textAlign: 'center'}}>
                      <Tooltip title="View Details">
                        <img onClick={() => handleViewDetails(index, activeTab)} src={EyeIcon} alt="View" />
                      </Tooltip>
                    </td>
                  </tr> 
                )
              })
            ) : (
              <tr>
                <td style={{maxWidth: "100%"}} className="no-data" colSpan={tableHeader.length}>
                  No candidates available
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loadingMessages && filteredCandidates.length !== 0 && <CircularLoading/>}
      </div>
      <CandidateDetailsModal
        tabIndex={activeTab}
        open={viewDetails}
        close={() => setViewDetails(false)}
        candidate={selectedCandidate}
        isEditable={true}
        userInfo={userInfo}
        updateChanges={handleUpdateChanges}
        updateMessage={updateMessage}
        updateTable={loadCandidates}
        handleGenerateLink={handleGenerateLink}
        generating={generating}
        questionnaireLink={questionnaireLink}
      />
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
    </div>
  );
};

export default CandidatesPage;