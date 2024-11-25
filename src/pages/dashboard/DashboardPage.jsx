import React from "react";
import "./DashboardPage.css";
import LineChart from "../../components/lineChart/LineChart";

const DashboardPage = (props) => {
  
  const setHeaderTitle = () => {
    props.title("Welcome, User!");
    props.subtitle("Here's an overview of your dashboard.");
  };

  setHeaderTitle();

  return (
    <div className="dashboard-container">
      <LineChart/>
    </div>
  );
};

export default DashboardPage;