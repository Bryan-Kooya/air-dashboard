import React, { useState, useEffect } from "react";
import "./CandidatesPage.css";
import { Select, Menu, MenuItem, Snackbar, Alert, Slide } from "@mui/material";
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import { db } from '../../firebaseConfig';
import { doc, setDoc } from "firebase/firestore";
import { fetchPaginatedCandidates, searchCandidates } from "../../utils/firebaseService";
import Pagination from "../../components/pagination/Pagination";
import { SearchIcon, FilterIcon } from "../../assets/images";
import { capitalizeFirstLetter } from "../../utils/utils";

const CandidatesPage = (props) => {
  const tableHeader = ["Candidate", "Status", "Job", "Company", "Location", "Experience", "Attachments"];
  const filterOptions = ["Job", "Status", "Experience"];
  const sortOptions = ["Newest", "Oldest"];
  const userId = props.userId;
  const userInfo = props.userInfo;
  const pageSize = 5;

  // State Management
  const [viewDetails, setViewDetails] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState({});
  const [candidates, setCandidates] = useState([]);
  const [filteredCandidates, setFilteredCandidates] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortedBy, setSortedBy] = useState("");
  const [filterBy, setFilterBy] = useState("");
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDocs, setLastVisibleDocs] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [messageType, setMessageType] = useState("");

  // Load candidates with pagination
  const loadCandidates = async (page) => {
    try {
      const lastVisibleDoc = page > 1 ? lastVisibleDocs[page - 2] : null;
      const { data, lastVisible, total } = await fetchPaginatedCandidates(pageSize, lastVisibleDoc, userId);

      setCandidates(data);
      setFilteredCandidates(data);

      setLastVisibleDocs((prev) => {
        const updatedDocs = [...prev];
        updatedDocs[page - 1] = lastVisible;
        return updatedDocs;
      });

      setTotalPages(Math.ceil(total / pageSize));
    } catch (error) {
      console.error("Error fetching candidates:", error);
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

  // Search candidates based on query
  const searchAndLoadCandidates = async () => {
    if (!searchQuery) {
      setCurrentPage(1);
      setLastVisibleDocs([]);
      await loadCandidates(1);
      return;
    }

    try {
      const data = await searchCandidates(searchQuery, userId);
      setCandidates(data);
      setFilteredCandidates(data);
      setTotalPages(1);
    } catch (error) {
      console.error("Error searching candidates:", error);
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

  useEffect(() => {
    if (!searchQuery) loadCandidates(currentPage);
  }, [currentPage]);

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
                <tr key={index} onClick={() => handleViewDetails(index)}>
                  <td>{capitalizeFirstLetter(candidate.contact?.name)}</td>
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
                </tr>
              ))
            ) : (
              <tr>
                <td className="no-data" colSpan={tableHeader.length}>
                  No candidates available
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination 
        currentPage={currentPage} 
        totalPages={totalPages} 
        onPageChange={setCurrentPage} 
      />
      <CandidateDetailsModal
        open={viewDetails}
        close={() => setViewDetails(false)}
        candidate={selectedCandidate}
        isEditable={true}
        userInfo={userInfo}
        updateChanges={handleUpdateChanges}
        updateMessage={updateMessage}
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