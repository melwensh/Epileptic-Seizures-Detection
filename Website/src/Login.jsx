import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginDoctor } from './dataService';
import Logo from './Logo';
import './styles.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [authError, setAuthError] = useState(''); 
  const navigate = useNavigate();

  // Validate email and password inputs
  const validateForm = () => {
    const newErrors = {};
    if (!email) newErrors.email = "Email is required.";
    if (!password) newErrors.password = "Password is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setAuthError(''); 
    
    if (validateForm()) {
      // Calling loginDoctor from dataService.js
      // Note: This function automatically saves the 'active_doctor' session in localStorage if successful!
      const result = loginDoctor(email, password);
      
      if (result.success) {
        // Session is saved successfully, redirect the doctor to their private dashboard
        navigate('/dashboard'); 
      } else {
        // Show error if email or password is wrong
        setAuthError(result.message); 
      }
    }
  };

  return (
    <div className="wrapper">
      {/* Redesigned Left Side Panel */}
      <div className="side-panel">
        <div className="glass-hero-card">
          <Logo className="hero-logo" />
          <h1 style={{ fontSize: '3.75rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.5px' }}>
            Epi<span style={{ color: '#2563eb' }}>Detect</span>
          </h1>
          <p>Advanced EEG-based epileptic seizure detection and patient data management platform.</p>
        </div>
      </div>
      
      <div className="form-container">
        <div className="form-box" style={{ maxWidth: '420px' }}>
          
          {/* Automatically shows up only on Mobile! */}
          <div className="mobile-logo-wrap">
            <Logo style={{ width: '48px', height: '48px' }} />
          </div>

          <h2>Sign In</h2>
          <p className="subtitle">Access the doctor portal</p>
          
          {authError && <div className="alert-text" style={{marginBottom: '1rem', display: 'block'}}>{authError}</div>}
          
          <form onSubmit={handleSubmit} noValidate>
            <div className="input-group">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors({...errors, email: ''}); setAuthError(''); }}
                placeholder="Doctor's Email"
                className={`input-field ${errors.email ? 'input-error' : ''}`}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            <div className="input-group">
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setErrors({...errors, password: ''}); setAuthError(''); }}
                placeholder="Password"
                className={`input-field ${errors.password ? 'input-error' : ''}`}
              />
              {errors.password && <span className="error-text">{errors.password}</span>}
            </div>
            <button type="submit" className="primary-btn mt-1">Secure Login</button>
          </form>
          <div className="link-container">
            <Link to="/register" className="link">Create a new account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}