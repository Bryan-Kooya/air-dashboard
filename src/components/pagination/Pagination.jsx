import React from "react";
import "./Pagination.css";

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  // Generate the list of pages for display
  const getPages = () => {
    const pages = [];
    if (totalPages <= 5) {
      // If total pages are 5 or less, show all page numbers
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // If total pages are more than 5, show ranges with ellipsis
      if (currentPage <= 3) {
        pages.push(1, 2, 3, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, "...", totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };

  const handlePageClick = (page) => {
    if (page !== "..." && page !== currentPage) {
      console.log("Changing to page:", page); // Debugging log
      onPageChange(page);
    }
  };

  // Render pagination component
  return (
    <div className="pagination">
      {/* Previous Button */}
      <div
        className={`pagination-button ${currentPage === 1 ? "disabled" : ""}`}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous Page"
      >
        &larr; Previous
      </div>

      {/* Page Numbers */}
      {getPages().map((page, index) => (
        <div
          key={index}
          className={`pagination-number ${page === currentPage ? "active" : ""}`}
          onClick={() => handlePageClick(page)}
          disabled={page === "..."}
          aria-label={page === "..." ? "Ellipsis" : `Page ${page}`}
        >
          {page}
        </div>
      ))}

      {/* Next Button */}
      <div
        className={`pagination-button ${currentPage === totalPages ? "disabled" : ""}`}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next Page"
      >
        Next &rarr;
      </div>
    </div>
  );
};

export default Pagination;