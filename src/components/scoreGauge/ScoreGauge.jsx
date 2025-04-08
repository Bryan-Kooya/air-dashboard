import React from "react";
import './ScoreGauge.css';
import { CircularProgress } from "@mui/material";

const ScoreGauge = (props) => {
  const title = props.title;
  const value = props.value;
  return (
    <div className="score-gauge-container">
      <div>{title}</div>
      <div className="progress-container">
        <div className="score-value">{value}<span className='section-label'>%</span></div>
        <CircularProgress
          variant="determinate"
          value={100}
          thickness={5}
          size={100}
          sx={{
            color: "#6E6E6E2B", // Gray color for the background track
          }}
        />
        <CircularProgress
          variant="determinate"
          value={value}
          thickness={5}
          size={100}
          sx={{ color: value < 70 ? "#eab308" : "#22c55e", position: "absolute" }} // Customize the color
        />
      </div>
    </div>
  );
};

export default ScoreGauge;