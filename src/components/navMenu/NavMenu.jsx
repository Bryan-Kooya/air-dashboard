import React, { useState, useEffect } from "react";
import "./NavMenu.css";
import { useNavigate, useLocation } from "react-router-dom";
import { Divider, Tooltip, Zoom } from "@mui/material";
import { AIAnalyzerIcon, DashboardIcon, MessageIcon, JobPostIcon, MatchIcon, BillingIcon, HelpIcon, CandidatesIcon, CVIcon, ListIcon, Questionnaire, TalentTap } from "../../assets/images";

const menuList = [
  { name: "Dashboard", icon: DashboardIcon, path: "/dashboard" },
  { name: "Messages", icon: MessageIcon, path: "/messages" },
  { name: "Contacts", icon: CVIcon, path: "/contacts" },
  { name: "Job Definitions", icon: JobPostIcon, path: "/job-definitions" },
  { name: "Match Candidates", icon: MatchIcon, path: "/match-candidates" },
  { name: "Candidates", icon: CandidatesIcon, path: "/candidates" },
  { name: "Questionnaires", icon: Questionnaire, path: "/questionnaires" },
  { name: "Billing", icon: BillingIcon, path: "/billing" },
  { name: "Help", icon: HelpIcon, path: "/help" },
];

const NavMenu = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const count = props.messagesCount;
  const [activeMenu, setActiveMenu] = useState(location.pathname);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    setActiveMenu(location.pathname);
  }, [location]);

  const disabledMenu = (name) => ["Dashboard", "Billing", "Help"].includes(name);

  const handlePageNavigate = (path, name) => {
    if (disabledMenu(name)) return;
    navigate(path);
    setActiveMenu(path);
  };

  const toggleMenu = () => {
    setIsMinimized(prev => !prev);
  };

  return (
    <div className={`nav-menu-container ${isMinimized ? 'minimized' : ''}`}>
      <div className="animated-div" onClick={toggleMenu}>
        <svg width="32" height="32" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="currentColor" />
          <text x="16" y="22" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="white" textAnchor="middle">TT</text>
        </svg>
        {!isMinimized && <span>TalentTap</span>}
      </div>
      <Divider />
      <div className="nav-container">
        {menuList.map((menu) => (
          <div
            key={menu.name}
            onClick={() => handlePageNavigate(menu.path, menu.name)}
            className={`menu-container${activeMenu === menu.path ? " active" : ""}${disabledMenu(menu.name) ? " disabled" : ""}`}
          >
            <Tooltip arrow placement="right" slots={{ transition: Zoom }} title={isMinimized ? menu.name : ""}>
              <img className="menu-icon" src={menu.icon} alt="logo" />
            </Tooltip>
            {!isMinimized && (
              <>
                <div>{menu.name}</div>
                {menu.name === "Messages" && <div className="message-count">{count}</div>}
              </>
            )}
            {activeMenu === menu.path && !disabledMenu(menu.name) && <div className="active-indicator"></div>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default NavMenu;