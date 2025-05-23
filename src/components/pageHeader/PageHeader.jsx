import React, { useEffect, useState } from "react";
import "./PageHeader.css"
import { Menu, MenuItem } from '@mui/material';
import { Avatar } from "../../assets/images";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { getInitials } from "../../utils/helper";

const PageHeader = (props) => {
  const navigate = useNavigate();
  const [filterAnchorEl, setFilterAnchorEl] = useState(null); // Anchor for the filter menu
  const title = props.title;
  const subtitle = props.subtitle;
  const user = props.user;

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  const handleMenuOpen = (event) => {
    setFilterAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setFilterAnchorEl(null);
  };

  return (
    <div className="header-container">
      <div>
        <div className="header-title">{title}</div>
        <div className="header-subtitle">{subtitle}</div>
      </div>
      <div className="user-card">
        {/* <img src={Bell} alt="Notification"/> */}
        <div style={{marginLeft: 'auto'}} className="user-info">
          <div>
            <div className="user-name">{user?.name ? user.name : 'Anonymous'}</div>
            <div className="subscription">Premium</div>
          </div>
          <div onClick={handleMenuOpen} className="user-avatar">
            {getInitials(user?.name)}
          </div>
          <Menu
            sx={{marginTop: '11px', left: '-32px'}}
            anchorEl={filterAnchorEl}
            open={Boolean(filterAnchorEl)}
            onClose={handleMenuClose}
          >
            <MenuItem
              id="options"
              onClick={handleLogout}
            >
              Logout
            </MenuItem>
          </Menu>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;