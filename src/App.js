import React, { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import { observeAuthState } from "./authService";
import NavMenu from "./components/navMenu/NavMenu";
import PageHeader from "./components/pageHeader/PageHeader";
import LoginPage from "./pages/login/LoginPage";
import AIResumeAnalyzerPage from "./pages/aiResumeAnalyzer/AIResumeAnalyzerPage";
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
  const [headerTitle, setHeaderTitle] = useState("");
  const [headerSubtitle, setHeaderSubtitle] = useState("");
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [messagesCount, setMessagesCount] = useState("0");

  const updateMessagesCount = (value) => {
    if (value > 99) setMessagesCount("+99");
    else setMessagesCount(value);
  };

  const getHeaderTitle = (value) => {
    setHeaderTitle(value);
  };

  const getHeaderSubtitle = (value) => {
    setHeaderSubtitle(value);
  };

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
            <NavMenu messagesCount={messagesCount} />
            <div className="view-section">
              <PageHeader title={headerTitle} subtitle={headerSubtitle} />
              <Routes>
              <Route path="/ai-resume-analyzer" element={<AIResumeAnalyzerPage title={getHeaderTitle} subtitle={getHeaderSubtitle} />} />
                <Route path="/dashboard" element={<DashboardPage title={getHeaderTitle} subtitle={getHeaderSubtitle} />} />
                <Route path="/messages" element={<MessagesPage title={getHeaderTitle} subtitle={getHeaderSubtitle} updateMessagesCount={updateMessagesCount} />} />
                <Route path="/job-postings" element={<JobPostingsPage title={getHeaderTitle} subtitle={getHeaderSubtitle} />} />
                <Route path="/match-candidates" element={<MatchCandidatesPage title={getHeaderTitle} subtitle={getHeaderSubtitle} />} />
                <Route path="/billing" element={<BillingPage title={getHeaderTitle} subtitle={getHeaderSubtitle} />} />
                <Route path="/help" element={<HelpPage title={getHeaderTitle} subtitle={getHeaderSubtitle} />} />
              </Routes>
            </div>
          </>
        )}
      </Router>
    </div>
  );
};

export default App;