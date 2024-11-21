import React, { useEffect } from "react";
import "./App.css";
import { BrowserRouter as Router, Route, Routes, useNavigate } from "react-router-dom";
import { observeAuthState } from "./authService";
import Login from "./pages/login/Login";
import Dashboard from "./pages/dashboard/Dashboard";

const AuthObserver = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = observeAuthState((user) => {
      if (user) {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  return null;
};

const App = () => {
  return (
    <Router>
      <AuthObserver />
      <Routes>
        <Route path="/" element={<Login/>} />
        <Route path="/dashboard" element={<Dashboard/>} />
      </Routes>
    </Router>
  );
};

export default App;
