import React from "react";
import "./BillingPage.css"
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";

const BillingPage = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/");
  };

  return (
    <div className="billing-container">
      <h2>Billing</h2>
      <button onClick={handleLogout}>Logout</button>
    </div>
  );
};

export default BillingPage;