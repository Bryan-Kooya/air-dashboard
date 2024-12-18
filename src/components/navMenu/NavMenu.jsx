import React, { useState, useEffect } from "react";
import "./NavMenu.css"
import { useNavigate, useLocation } from "react-router-dom";
import { AIRIcon, AIRLogo } from "../../assets/images";
import { Divider } from "@mui/material";
import { AIAnalyzerIcon, DashboardIcon, MessageIcon, JobPostIcon, MatchIcon, BillingIcon, HelpIcon, CandidatesIcon } from "../../assets/images";

const menuList = [
  {name: "AI Resume Analyzer", icon: AIAnalyzerIcon, path: "/ai-resume-analyzer"},
  {name: "Dashboard", icon: DashboardIcon, path: "/dashboard" },
  {name: "Messages", icon: MessageIcon, path: "/messages" },
  {name: "Candidates", icon: CandidatesIcon, path: "/candidates" },
  {name: "Job Postings", icon: JobPostIcon, path: "/job-postings" },
  {name: "Match Candidates", icon: MatchIcon, path: "/match-candidates" },
  {name: "Billing", icon: BillingIcon, path: "/billing" },
  {name: "Help", icon: HelpIcon, path: "/help" },
];

const NavMenu = (props) => {
  const navigate = useNavigate();
  const location = useLocation(); // Get current path
  const count = props.messagesCount;
  const [activeMenu, setActiveMenu] = useState(location.pathname);

  useEffect(() => {
    setActiveMenu(location.pathname);
  }, [location]);

  const handlePageNavigate = (path) => {
    navigate(path);
    setActiveMenu(path);
  };

  return (
    <div className="nav-menu-container">
      <div className="air-section">
        <img src={AIRIcon} alt="AIR Icon"/>
        <img src={AIRLogo} alt="AIR Logo"/>
      </div>
      <Divider/>
      <div className="nav-container">
        {menuList.map((menu, index) => (
          <div key={menu.name} onClick={() => handlePageNavigate(menu.path)} className={`menu-container${activeMenu === menu.path ? " active" : ""}`}>
            <img className="menu-icon" src={menu.icon} alt="logo"/>
            <div>{menu.name}</div>
            {menu.name === 'Messages' && <div className="message-count">{count}</div>}
            {activeMenu === menu.path && <div className="active-indicator"></div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default NavMenu;