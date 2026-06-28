import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerDoctor } from './dataService';
import Logo from './Logo';
import './styles.css';

export default function Register() {
  // 1. Specialty is completely removed from state
  const [formData, setFormData] = useState({ 
    name: '', email: '', password: '', phone: '', hospital: '' 
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const navigate = useNavigate();

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    const phoneRegex = /^01[0125][0-9]{8}$/;

    // 2. Safe checks added before .trim() to prevent crashes
    if (!formData.name || !formData.name.trim() || formData.name.length < 3) {
      newErrors.name = "Min 3 characters.";
    }
    if (!formData.email || !emailRegex.test(formData.email)) {
      newErrors.email = "Valid email required.";
    }
    if (!formData.password || !passwordRegex.test(formData.password)) {
      newErrors.password = "Min 8 chars, 1 uppercase, 1 number, 1 special.";
    }
    if (!formData.phone || !phoneRegex.test(formData.phone)) {
      newErrors.phone = "Valid 11-digit mobile (e.g. 010...).";
    }
    if (!formData.hospital || !formData.hospital.trim() || formData.hospital.length < 3) {
      newErrors.hospital = "Hospital required.";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setServerError('');
    
    if (validateForm()) {
      // 3. Removed specialty from the function call
      const result = registerDoctor(
        formData.name, formData.email, formData.password, 
        formData.phone, formData.hospital
      );
      
      if (result.success) {
        alert("Account created successfully! Please sign in.");
        navigate('/login');
      } else {
        setServerError(result.message); 
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
  };

  return (
    <div className="wrapper">
      <div className="side-panel">
        <div className="glass-hero-card">
          <Logo className="hero-logo" />
          <span className="tech-badge">Secure Registration</span>
          <h1 style={{ fontSize: '2.75rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-0.5px' }}>Join Epi<span style={{ color: '#2563eb' }}>Detect</span></h1>
          <p>Create your secure professional portal to analyze EEG data and manage patient records.</p>
        </div>
      </div>
      
      <div className="form-container">
        <div className="form-box" style={{ maxWidth: '580px' }}>
          
          <div className="mobile-logo-wrap">
            <Logo style={{ width: '48px', height: '48px' }} />
          </div>

          <h2>Create Account</h2>
          <p className="subtitle">Register your professional credentials</p>
          
          {serverError && <div className="alert-text" style={{marginBottom: '1rem', display: 'block'}}>{serverError}</div>}
          
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
              
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <input type="text" name="name" value={formData.name} onChange={handleChange}
                  placeholder="Full Name (Dr. / Prof.)" className={`input-field ${errors.name ? 'input-error' : ''}`} />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>

              <div className="input-group">
                <input type="email" name="email" value={formData.email} onChange={handleChange}
                  placeholder="Work Email" className={`input-field ${errors.email ? 'input-error' : ''}`} />
                {errors.email && <span className="error-text">{errors.email}</span>}
              </div>

              <div className="input-group">
                <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                  placeholder="Phone (11 Digits)" className={`input-field ${errors.phone ? 'input-error' : ''}`} />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>

              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <input type="text" name="hospital" value={formData.hospital} onChange={handleChange}
                  placeholder="Hospital / Clinic" className={`input-field ${errors.hospital ? 'input-error' : ''}`} />
                {errors.hospital && <span className="error-text">{errors.hospital}</span>}
              </div>

              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <input type="password" name="password" value={formData.password} onChange={handleChange}
                  placeholder="Create Secure Password" className={`input-field ${errors.password ? 'input-error' : ''}`} />
                {errors.password && <span className="error-text">{errors.password}</span>}
              </div>

            </div>
            
            <button type="submit" className="primary-btn mt-1">Register Account</button>
          </form>
          <div className="link-container">
            <span>Already have an account? </span>
            <Link to="/login" className="link">Sign In here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}