import React, { useState } from "react";
import "./CircularLoading.css";
import { CircularProgress } from "@mui/material";

const CircularLoading = (props) => {
  const color = props.color;
  
  return (
    <div className="progress-container">
      {/* Background Circle (Track) */}
      <CircularProgress
        variant="determinate"
        size={30}
        thickness={6}
        value={100}
        sx={{
          color: "#6E6E6E2B", // Gray color for the background track
        }}
      />
      {/* Foreground Progress */}
      <CircularProgress
        size={30}
        thickness={6}
        sx={{
          color: color, // Green color for the actual progress
          position: "absolute", // Place on top of the track
        }}
      />
    </div>
  );
};

export default CircularLoading;