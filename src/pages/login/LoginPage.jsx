import React, { useState } from "react";
import "./LoginPage.css"
import { useNavigate } from "react-router-dom";
import { observeAuthState, loginUser, registerUser } from "../../authService";
import { EyeIcon, EyeSlash, TalentTap } from "../../assets/images";

const LoginPage = (props) => {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      setError("");
      const user = await loginUser(email, password);
      props.updateUser(user);
      navigate("/messages");
    } catch (error) {
      setError("Incorrect email or password");
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
        <div className="talent-tap-logo">
          <img src={TalentTap}/><span>TalentTap</span>
        </div>
        <div className="login-message">Welcome back</div>
        <div className="login-submessage">Enter your credentials to access your account</div>
        <form className="login-form" onSubmit={handleLogin}>
          <div className="input-field">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => {setError(''); setEmail(e.target.value)}}
            />
          </div>
          <div className="input-field">
            <input
              style={{paddingRight: 35}}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => {setError(''); setPassword(e.target.value)}}
            /><img className="input-icon" onClick={togglePasswordVisibility} src={showPassword ? EyeSlash : EyeIcon}/>
          </div>
          {error && <div className="error-message">{error}</div>}
          <button className="login-btn" type="submit">Sign in</button>
          <div className="login-submessage">Dont have an account?<span className="free-trial-link">Start free trial</span></div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
