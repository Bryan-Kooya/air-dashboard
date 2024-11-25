import React from "react";
import "./BillingPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

const BillingPage = (props) => {
  const navigate = useNavigate();

  const setHeaderTitle = () => {
    props.title("Billing");
    props.subtitle("Choose the job title and paste tags below to find the best candidates.");
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };
  
  setHeaderTitle();

  return (
    <div className="billing-container">
      <h2>Billing</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default BillingPage;