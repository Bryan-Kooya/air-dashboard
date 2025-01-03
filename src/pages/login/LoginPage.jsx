import React, { useState } from "react";
import "./LoginPage.css"
import { useNavigate } from "react-router-dom";
import { observeAuthState, loginUser, registerUser } from "../../authService";
import { Apple, Facebook, Google, TopCorner, BottomCorner } from "../../assets/images";

const LoginPage = (props) => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      setError("");
      const userId = await loginUser(email, password);
      props.userId(userId);
      alert("Login successfully!");
      navigate("/messages");
    } catch (error) {
      setError("Incorrect email or password");
      alert("Login failed! Please check your email and password.");
    }
  };  

  const handleRegister = async (event) => {
    event.preventDefault();
    try {
      setError("");
      await registerUser(email, password);
      setIsRegistering(false);
    } catch (error) {
      setError("Email already in use");
    }
  };

  return (
    <div className="main-container">
      <div className="login-container">
        <div className="login-title">A.I.R</div>
        <div className="login-subtitle">Let's Get Started!</div>
        <form onSubmit={handleLogin}>
          <div className="input-field">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="input-field">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="login-btn" type="submit">Sign in</button>
        </form>
        <div className="label">Or continue with</div>
        <div className="icon-container">
          <img src={Google} alt="Google"/>
          <img src={Facebook} alt="Facebook"/>
          <img src={Apple} alt="Apple"/>
        </div>
        <img className="top-corner" src={TopCorner} alt="Corner"/>
        <img className="bottom-corner" src={BottomCorner} alt="Corner"/>
      </div>
    </div>
  );
};

export default LoginPage;
