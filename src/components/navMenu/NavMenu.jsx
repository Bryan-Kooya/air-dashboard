import React from "react";
import "./NavMenu.css"
import { useNavigate } from "react-router-dom";
import { AIRIcon, AIRLogo } from "../../assets/images";
import { Divider } from "@mui/material";
import { DashboardIcon, MessageIcon, JobPostIcon, CandidateIcon, BillingIcon, HelpIcon } from "../../assets/images";

const menuList = [
  {name: "Dashboard", icon: DashboardIcon, path: "/dashboard" },
  {name: "Messages", icon: MessageIcon, path: "/messages" },
  {name: "Job Postings", icon: JobPostIcon, path: "/job-postings" },
  {name: "Match Candidates", icon: CandidateIcon, path: "/match-candidates" },
  {name: "Billing", icon: BillingIcon, path: "/billing" },
  {name: "Help", icon: HelpIcon, path: "/help" },
];

const NavMenu = () => {
  const navigate = useNavigate();

  const handlePageNavigate = (path) => {
    navigate(path);
  };

  return (
    <div className="nav-menu-container">
      <div className="air-section">
        <img src={AIRIcon} alt="AIR Icon"/>
        <img src={AIRLogo} alt="AIR Logo"/>
      </div>
      <Divider/>
      <div className="nav-container">
        {menuList.map(menu => (
          <div key={menu.name} onClick={() => handlePageNavigate(menu.path)} className="menu-container">
            <img className="menu-icon" src={menu.icon} alt="logo"/>
            <div>{menu.name}</div>
            {menu.name === 'Messages' && <div className="message-count">+16</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default NavMenu;