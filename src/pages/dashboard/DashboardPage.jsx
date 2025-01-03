import React from "react";
import "./DashboardPage.css";
import LineChart from "../../components/lineChart/LineChart";

const DashboardPage = (props) => {
  
  (function setHeaderTitle() {
    props.title("Welcome, User!");
    props.subtitle("Here's an overview of your dashboard.");
  })();

  return (
    <div className="dashboard-container">
      <LineChart/>
    </div>
  );
};

export default DashboardPage;