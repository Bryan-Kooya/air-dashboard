import React, { useState, useEffect } from "react";
import "./NavMenu.css";
import { useNavigate, useLocation } from "react-router-dom";
import { AIRIcon, AIRLogo } from "../../assets/images";
import { Divider } from "@mui/material";
import { AIAnalyzerIcon, DashboardIcon, MessageIcon, JobPostIcon, MatchIcon, BillingIcon, HelpIcon, CandidatesIcon, CVIcon } from "../../assets/images";

const menuList = [
  // {name: "AI Resume Analyzer", icon: AIAnalyzerIcon, path: "/ai-resume-analyzer"},
  { name: "Dashboard", icon: DashboardIcon, path: "/dashboard" },
  { name: "Messages", icon: MessageIcon, path: "/messages" },
  { name: "Contacts", icon: CVIcon, path: "/contacts" },
  { name: "Job Definitions", icon: JobPostIcon, path: "/job-definitions" },
  { name: "Candidates Status", icon: CandidatesIcon, path: "/candidates-status" },
  { name: "Match Candidates", icon: MatchIcon, path: "/match-candidates" },
  { name: "Billing", icon: BillingIcon, path: "/billing" },
  { name: "Help", icon: HelpIcon, path: "/help" },
];

const NavMenu = (props) => {
  const navigate = useNavigate();
  const location = useLocation(); // Get current path
  const count = props.messagesCount;
  const [activeMenu, setActiveMenu] = useState(location.pathname);

  useEffect(() => {
    setActiveMenu(location.pathname);
  }, [location]);

  // Define disabled menus
  const disabledMenu = (name) => {
    return ["Dashboard", "Billing", "Help"].includes(name); // Add menu names to disable
  };

  const handlePageNavigate = (path, name) => {
    if (disabledMenu(name)) {
      return; // Prevent navigation if menu is disabled
    }
    navigate(path);
    setActiveMenu(path);
  };

  return (
    <div className="nav-menu-container">
      <div className="animated-div">
        <svg width="32" height="32" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="currentColor" />
          <text x="16" y="22" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">TT</text>
        </svg>
        <span>TalentTap</span>
      </div>
      <Divider />
      <div className="nav-container">
        {menuList.map((menu) => (
          <div
            key={menu.name}
            onClick={() => handlePageNavigate(menu.path, menu.name)}
            className={`menu-container${activeMenu === menu.path ? " active" : ""}${disabledMenu(menu.name) ? " disabled" : ""}`}
          >
            <img className="menu-icon" src={menu.icon} alt="logo" />
            <div>{menu.name}</div>
            {menu.name === "Messages" && <div className="message-count">{count}</div>}
            {activeMenu === menu.path && !disabledMenu(menu.name) && <div className="active-indicator"></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NavMenu;