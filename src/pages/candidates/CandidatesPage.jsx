import React, { useState, useEffect } from "react";
import "./CandidatesPage.css";
import { Select, Menu, MenuItem } from '@mui/material';
import CandidateDetailsModal from "../../components/candidateDetailsModal/CandidateDetailsModal";
import { fetchPaginatedCandidates, searchCandidates } from "../../utils/firebaseService";
import Pagination from "../../components/pagination/Pagination";
import { SearchIcon, FilterIcon } from "../../assets/images";
import { capitalizeFirstLetter } from "../../utils/utils";

const CandidatesPage = (props) => {
  const tableHeader = ["Candidate", "Job", "Status", "Company", "Location", "Experience", "Attachments"];
  const filterOptions = ["Job", "Status", "Experience"];
  const sortOptions = ["Newest", "Oldest"];
  const [error, setError] = useState(null);
  const [viewDetails, setViewDetails] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastVisibleDocs, setLastVisibleDocs] = useState([]); // Track lastVisibleDoc for each page
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 5; // Number of candidates per page
  const [searchQuery, setSearchQuery] = useState(""); // Search query state
  const [sortedBy, setSortedBy] = useState("");
  const [filterBy, setFilterBy] = useState(""); // Holds the selected filter value
  const [filterAnchorEl, setFilterAnchorEl] = useState(null); // Anchor for the filter menu
  const [filteredCandidates, setFilteredCandidates] = useState([]); // Filtered candidates

  // Load all candidates when the page loads
  const loadCandidates = async () => {
    try {
      const { data, total } = await fetchPaginatedCandidates(pageSize, null);
      setCandidates(data);
      setFilteredCandidates(data);
      setTotalPages(Math.ceil(total / pageSize));
    } catch (error) {
      console.error("Error fetching candidates:", error);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  // Filter and sort candidates
  const applyFilterAndSort = (filter, sort) => {
    let updatedCandidates = [...candidates];
  
    // Filter Logic
    if (filter === "Job") {
      updatedCandidates.sort((a, b) => (a.job || "").localeCompare(b.job || ""));
    } else if (filter === "Status") {
      updatedCandidates.sort((a, b) => (a.status || "").localeCompare(b.status || ""));
    } else if (filter === "Experience") {
      updatedCandidates.sort((a, b) => (b.total_experience_years || 0) - (a.total_experience_years || 0));
    }
  
    // Sort Logic for Timestamps
    if (sort === "Newest") {
      updatedCandidates.sort((a, b) => {
        const dateA = a.timestamp ? timestampToDate(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? timestampToDate(b.timestamp) : new Date(0);
        return dateB - dateA;
      });
    } else if (sort === "Oldest") {
      updatedCandidates.sort((a, b) => {
        const dateA = a.timestamp ? timestampToDate(a.timestamp) : new Date(0);
        const dateB = b.timestamp ? timestampToDate(b.timestamp) : new Date(0);
        return dateA - dateB;
      });
    }
  
    setFilteredCandidates(updatedCandidates);
  };  

  const handleFilterMenuOpen = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setFilterAnchorEl(null);
  };

  const handleFilterChange = (value) => {
    setFilterBy(value);
    applyFilterAndSort(value, sortedBy);
    setFilterAnchorEl(null); // Close the menu after selection
  };

  const handleSortedBy = (value) => {
    setSortedBy(value);
    applyFilterAndSort(filterBy, value);
  };

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await searchCandidates(searchQuery);
      setFilteredCandidates(data);
    } catch (error) {
      console.error("Error searching candidates:", error);
    }
  };

  const handleViewDetails = (index) => {
    setSelectedCandidate(filteredCandidates[index]);
    setViewDetails(true);
  };

  (function setHeaderTitle() {
    props.title("Candidates");
    props.subtitle("Centralized page to view and manage all candidates");
  })();

  const timestampToDate = (timestamp) => {
    return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1000000);
  };

  console.log('Candidates: ', candidates);

  return (
    <div className="candidates-container">
      <div>
        <div className="candidates card">
          <div className="title-container">
            <div className="card-title">All Candidates</div>
            <div className="flex">
              <button
                onClick={handleFilterMenuOpen}
                className="filter-button"
              >
                <img src={FilterIcon} alt="Filter"/>Filter
              </button>
              <Menu
                sx={{marginTop: '4px'}}
                anchorEl={filterAnchorEl}
                open={Boolean(filterAnchorEl)}
                onClose={handleFilterMenuClose}
              >
                {filterOptions.map((option, index) => (
                  <MenuItem
                    id="options" 
                    key={index}
                    onClick={() => handleFilterChange(option)}
                  >
                    {option}
                  </MenuItem>
                ))}
              </Menu>
              <Select 
                id="select-input" 
                displayEmpty
                value={sortedBy} 
                onChange={(e) => handleSortedBy(e.target.value)}
                renderValue={() => sortedBy ? sortedBy : "Sort by"}
              >
                {sortOptions.map((option, index) => (
                  <MenuItem id="options" key={index} value={option} onChange={() => handleSortedBy(option)}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              <form className="search-container" onSubmit={handleSearchSubmit}>
                <div className="search-wrapper">
                  <img onClick={handleSearchSubmit} src={SearchIcon} alt="Search Icon" className="search-icon" />
                  <input
                    className="search-input"
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button className="search primary-button" type="submit">Search</button>
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
            {filteredCandidates && filteredCandidates.length > 0 ? (
              filteredCandidates.map((candidate, index) => (
                <tr onClick={() => handleViewDetails(index)} key={index}>
                  <td>{capitalizeFirstLetter(candidate.contact?.name)}</td>
                  <td>{candidate.job}</td>
                  <td>
                    <div className={`status-badge ${candidate.status.toLowerCase().replace(/\s/g, "-")}`}></div>
                    {candidate.status}
                  </td>
                  <td>{candidate.company}</td>
                  <td>{candidate.location}</td>
                  <td>{candidate.total_experience_years + ' year(s)'}</td>
                  <td className="cv-link">CV_Frontend_Dev.pdf</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="no-data">No candidate available</td>
              </tr>
            )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>
      <CandidateDetailsModal 
        open={viewDetails} 
        close={() => setViewDetails(false)}
        candidate={selectedCandidate}
        isEditable={true}
        loadCandidates={loadCandidates}
      />
    </div>
  );
};

export default CandidatesPage;