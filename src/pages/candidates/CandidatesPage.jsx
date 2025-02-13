import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./CandidatesPage.css";
import { Select, Menu, MenuItem, Snackbar, Alert, Slide, Tooltip, CircularProgress } from "@mui/material";
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import { db } from '../../firebaseConfig';
import { doc, setDoc, updateDoc, serverTimestamp, collection, getDocs, query, where } from "firebase/firestore";
import { fetchPaginatedCandidates, searchCandidates } from "../../utils/firebaseService";
import { SearchIcon, FilterIcon, FileIcon, ShowPassword } from "../../assets/images";
import { capitalizeFirstLetter } from "../../utils/utils";
import CircularLoading from "../../components/circularLoading/CircularLoading";
import { apiBaseUrl } from "../../utils/constants";

const CandidatesPage = (props) => {
  const tableHeader = ["Candidate", "Status", "Job", "Company", "Location", "Experience", "Attachments", "Score", "Actions"];
  const filterOptions = ["Job", "Status", "Experience"];
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

  const lastCandidateElementRef = useCallback(node => {
    if (loadingMessages) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMoreCandidates();
      }
    }, { threshold: 0.5 });

    if (node) observer.current.observe(node);
  }, [loadingMessages, hasMore]);

  // Load candidates with pagination
  const loadCandidates = async () => {
    try {
      const { data, lastVisible: last, total } = await fetchPaginatedCandidates(pageSize, null, userId);
      setCandidates(data);
      setFilteredCandidates(data);
      setLastVisible(last);
      setHasMore(data.length < total);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      updateMessage("Error loading candidates", "error", true);
    }
  };

  // console.log('Candidates: ', candidates)

  const loadMoreCandidates = async () => {
    if (!hasMore || loadingMessages) return;
    
    setLoadingMessages(true);
    try {
      const { data, lastVisible: last, total } = await fetchPaginatedCandidates(
        pageSize,
        lastVisible,
        userId
      );
      
      if (data.length > 0) {
        setCandidates([...candidates, ...data]);
        setFilteredCandidates([...filteredCandidates, ...data]);
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

  // Search candidates based on query
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
      const data = await searchCandidates(searchQuery, userId);
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
          where("name", "==", candidate.contact.name),
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
      updatedCandidates = updatedCandidates.sort((a, b) => {
        if (filter === "Job") return (a.job || "").localeCompare(b.job || "");
        if (filter === "Status") return (a.status || "").localeCompare(b.status || "");
        if (filter === "Experience") return (b.total_experience_years || 0) - (a.total_experience_years || 0);
        return 0;
      });
    }

    // Apply sort
    if (sort) {
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

  const handleViewDetails = (index) => {
    setSelectedCandidate(filteredCandidates[index]);
    setViewDetails(true);
  };

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  const generateLink = async (candidate) => {
    setGenerating(true);
    console.log('candidate', candidate.questionnaireData.link)
    try {
      if(candidate.questionnaireData && candidate.questionnaireData.questions.length > 0) {
        navigator.clipboard.writeText(candidate.questionnaireData.link);
        console.log("Using existing questionnaire data link.");
      } else {
        const response = await fetch(`${apiBaseUrl}/questionnaire/generate-link`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jobTitle: candidate.jobTitle,
            jobDescription: candidate.generatedDescription,
            candidateId: candidate.id,
            language: candidate.language,
          }),
        });

        if (!response.ok) {
          throw new Error(await response.text());
        }
      
        const data = await response.json();
        console.log('Data: ', data);

        const candidateDoc = doc(db, "candidates", candidate.id);
        await updateDoc(candidateDoc, { questionnaireData: data });
        setCandidates((prevCandidates) =>
          prevCandidates.map((c) =>
            c.id === candidate.id
              ? { ...c, questionnaireData: data } // Update the specific candidate
              : c // Keep other candidates unchanged
          )
        );
        // selectedCandidate.questionnaireData = data;
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

  const handleGenerateLink = async (candidate) => {
    if (candidate.questionnaireData?.isAnswered) {
      navigate(`/questionnaire/${candidate.id}`);
    } else {
      await generateLink(candidate);
      setTimeout(() => {
        updateMessage("Questionnaire link has been copied to clipboard.", "success", true);
      }, 800);
    }
  };

  // Watch for changes in searchQuery
  useEffect(() => {
    if (searchQuery === "" || searchQuery.length >= 3) {
      handleSearchSubmit({ preventDefault: () => {} }); // Simulate form submission
    }
  }, [searchQuery]);

  (function setHeaderTitle() {
    props.title("Candidates");
    props.subtitle("Centralized page to view and manage all candidates");
  })();

  return (
    <div className="candidates-container">
      <div className="candidates card">
        <div className="title-container">
          <div className="card-title">All Candidates</div>
          <div className="flex">
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
                <th key={index}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCandidates.length > 0 ? (
              filteredCandidates.map((candidate, index) => (
                <tr 
                  key={index}
                  ref={index === candidates.length - 1 ? lastCandidateElementRef : null}
                >
                  <td onClick={() => handleViewDetails(index)}>{capitalizeFirstLetter(candidate.contact?.name)}</td>
                  <td>
                    <div className={`status-badge ${candidate.status?.toLowerCase().replace(/\s/g, "-")}`}></div>
                    {candidate.status}
                  </td>
                  <td>{candidate.jobTitle}</td>
                  <td>{candidate.company}</td>
                  <td>{candidate.location}</td>
                  <td>{candidate.total_experience_years} year(s)</td>
                  <td className="cv-link">
                    <a href={candidate.contact?.url} target="_blank" rel="noopener noreferrer">
                      {candidate.contact?.fileName || "Attachment"}
                    </a>
                  </td>
                  <td style={{textAlign: 'center'}}>{candidate.questionnaireData?.totalScore || 0}%</td>
                  <td style={{textAlign: 'center'}}>
                    {generating && index ?
                    <CircularProgress thickness={5} size={10} color='black'/> :
                    <Tooltip title={candidate.questionnaireData?.isAnswered ? 'View Assesment' : 'Generate Questionnaire Link'}>
                      <img 
                        width={16} height={16}
                        onClick={() => handleGenerateLink(candidate)} 
                        src={candidate.questionnaireData?.isAnswered ? ShowPassword : FileIcon} 
                        alt={``} 
                      />
                    </Tooltip>}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td style={{maxWidth: "100%"}} className="no-data" colSpan={tableHeader.length}>
                  No candidates available
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {loadingMessages && <CircularLoading/>}
      </div>
      <CandidateDetailsModal
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