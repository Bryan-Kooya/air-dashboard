import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import { observeAuthState } from "./authService";
import NavMenu from "./components/navMenu/NavMenu";
import PageHeader from "./components/pageHeader/PageHeader";
import LoginPage from "./pages/login/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import MessagesPage from "./pages/messages/MessagesPage";
import JobPostingsPage from "./pages/jobPostings/JobPostingsPage";
import MatchCandidatesPage from "./pages/matchCandidates/MatchCandidatesPage";
import BillingPage from "./pages/billing/BillingPage";
import HelpPage from "./pages/help/HelpPage";

const AuthObserver = ({ setAuthenticated }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = observeAuthState((user) => {
      if (user) {
        setAuthenticated(true);
        // navigate('/dashboard');
      } else {
        setAuthenticated(false);
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate, setAuthenticated]);

  return null;
};

const App = () => {
  const [isAuthenticated, setAuthenticated] = useState(false);

  return (
    <div className="page-container">
      <Router>
        <AuthObserver setAuthenticated={setAuthenticated} />
        {!isAuthenticated ? (
          <Routes>
            <Route path="/" element={<LoginPage />} />
          </Routes>
        ) : (
          <>
            <NavMenu />
            <div className="view-section">
              <PageHeader />
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/messages" element={<MessagesPage />} />
                <Route path="/job-postings" element={<JobPostingsPage />} />
                <Route path="/match-candidates" element={<MatchCandidatesPage />} />
                <Route path="/billing" element={<BillingPage />} />
                <Route path="/help" element={<HelpPage />} />
              </Routes>
            </div>
          </>
        )}
      </Router>
    </div>
  );
};

export default App;