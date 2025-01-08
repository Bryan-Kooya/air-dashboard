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
import CandidatesPage from "./pages/candidates/CandidatesPage";
import JobPostingsPage from "./pages/jobPostings/JobPostingsPage";
import MatchCandidatesPage from "./pages/matchCandidates/MatchCandidatesPage";
import ContactsPage from "./pages/contacts/ContactsPage";
import BillingPage from "./pages/billing/BillingPage";
import HelpPage from "./pages/help/HelpPage";
import { getConversationCount } from "./utils/firebaseService";
import { getUser } from "./utils/firebaseService";

const AuthObserver = ({ setAuthenticated, updateUser, onLogin, setUserInfo }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = observeAuthState(async (user) => {
      if (user) {
        setAuthenticated(true);
        updateUser(user);
        const userInfo = await getUser(user.email);
        setUserInfo(userInfo);
        try {
          await onLogin(user?.uid);
        } catch (error) {
          console.error("Error during login process:", error);
        }
      } else {
        setAuthenticated(false);
        updateUser(null);
        setUserInfo("");
        navigate("/");
      }
    });
    return () => unsubscribe();
  }, [navigate, setAuthenticated, updateUser, onLogin, setUserInfo]);

  return null;
};

const App = () => {
  const [headerTitle, setHeaderTitle] = useState("");
  const [headerSubtitle, setHeaderSubtitle] = useState("");
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [messagesCount, setMessagesCount] = useState("0");
  const [userId, setUserId] = useState(null);
  const [userInfo, setUserInfo] = useState("");

  const updateUser = (user) => {
    setUserId(user?.uid);
  };

  const updateMessagesCount = (count) => {
    setMessagesCount(count > 99 ? "+99" : count.toString());
  };

  const fetchAndSetMessageCount = async (userId) => {
    try {
      const count = await getConversationCount(userId); // Fetch count only
      updateMessagesCount(count);
    } catch (error) {
      console.error("Error fetching conversation count:", error);
    }
  };

  const getHeaderTitle = (value) => setHeaderTitle(value);
  const getHeaderSubtitle = (value) => setHeaderSubtitle(value);

  return (
    <div className="page-container">
      <Router>
        <AuthObserver setAuthenticated={setAuthenticated} updateUser={updateUser} onLogin={fetchAndSetMessageCount} setUserInfo={setUserInfo} />
        {!isAuthenticated ? (
          <Routes>
            <Route path="/" element={<LoginPage updateUser={updateUser} />} />
          </Routes>
        ) : (
          <>
            <NavMenu messagesCount={messagesCount} />
            <div className="view-section">
              <PageHeader title={headerTitle} subtitle={headerSubtitle} user={userInfo} />
              <Routes>
                <Route
                  path="/ai-resume-analyzer"
                  element={<AIResumeAnalyzerPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/dashboard"
                  element={<DashboardPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/messages"
                  element={<MessagesPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/candidates-status"
                  element={<CandidatesPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/job-definitions"
                  element={<JobPostingsPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/match-candidates"
                  element={<MatchCandidatesPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/contacts"
                  element={<ContactsPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/billing"
                  element={<BillingPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
                <Route
                  path="/help"
                  element={<HelpPage title={getHeaderTitle} subtitle={getHeaderSubtitle} userId={userId} />}
                />
              </Routes>
            </div>
          </>
        )}
      </Router>
    </div>
  );
};

export default App;