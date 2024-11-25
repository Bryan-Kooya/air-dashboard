import React, { useEffect, useState } from "react";
import "./PageHeader.css"
import { Bell, Avatar } from "../../assets/images";

const PageHeader = (props) => {
  const title = props.title;
  const subtitle = props.subtitle;

  return (
    <div className="header-container">
      <div>
        <div className="header-title">{title}</div>
        <div className="header-subtitle">{subtitle}</div>
      </div>
      <div className="user-card">
        <img src={Bell} alt="Notification"/>
        <div className="user-info">
          <div>
            <div className="user-name">Artem Delvy</div>
            <div className="subscription">Premium</div>
          </div>
          <img src={Avatar} alt="Avatar"/>
        </div>
      </div>
    </div>
  );
};

export default PageHeader;