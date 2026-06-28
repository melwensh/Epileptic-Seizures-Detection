import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActiveDoctorSession, getDoctorProfile, updateDoctorProfile } from './dataService';
import './styles.css';

export default function Profile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [originalEmail, setOriginalEmail] = useState('');
  
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', hospital: ''
  });

  useEffect(() => {
    const session = getActiveDoctorSession();
    if (!session) {
      navigate('/login');
      return;
    }
    const profile = getDoctorProfile(session.email);
    if (profile) {
      setOriginalEmail(profile.email);
      setFormData({
        name: profile.name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        hospital: profile.hospital || ''
      });
    }
  }, [navigate]);

  const validateProfile = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^01[0125][0-9]{8}$/;

    if (!formData.name.trim() || formData.name.length < 3) newErrors.name = "Name must be at least 3 characters.";
    if (!emailRegex.test(formData.email)) newErrors.email = "Valid email is required.";
    if (!phoneRegex.test(formData.phone)) newErrors.phone = "Must be a valid 11-digit mobile number.";
    if (!formData.hospital.trim() || formData.hospital.length < 3) newErrors.hospital = "Hospital name is required.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = (e) => {
    e.preventDefault();
    setServerError('');
    
    if (validateProfile()) {
      const result = updateDoctorProfile(originalEmail, formData);
      
      if (result.success) {
        setOriginalEmail(formData.email); 
        setIsEditing(false); 
        alert("Profile updated successfully!");
      } else {
        setServerError(result.message);
      }
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: '' });
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Doctor Profile</h1>
          <p className="subtitle">Manage your personal and professional information</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="secondary-btn small-btn">
          Back to Dashboard
        </button>
      </div>

      <div className="form-box" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0 }}>{isEditing ? 'Edit Information' : 'Profile Details'}</h2>
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="primary-btn small-btn">Edit Profile</button>
          )}
        </div>

        {serverError && <div className="alert-text" style={{marginBottom: '1rem', display: 'block'}}>{serverError}</div>}

        <form onSubmit={handleSave} noValidate>
          <div className="input-group">
            <label className="input-label">Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange}
              className={`input-field ${errors.name ? 'input-error' : ''}`} disabled={!isEditing} />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Email Address (Login ID)</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange}
              className={`input-field ${errors.email ? 'input-error' : ''}`} disabled={!isEditing} />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="input-group">
            <label className="input-label">Phone Number</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
              className={`input-field ${errors.phone ? 'input-error' : ''}`} disabled={!isEditing} />
            {errors.phone && <span className="error-text">{errors.phone}</span>}
          </div>

          <div className="input-group" style={{ gridColumn: '1 / -1' }}>
            <label className="input-label">Hospital / Clinic</label>
            <input type="text" name="hospital" value={formData.hospital} onChange={handleChange}
              className={`input-field ${errors.hospital ? 'input-error' : ''}`} disabled={!isEditing} />
            {errors.hospital && <span className="error-text">{errors.hospital}</span>}
          </div>

          {isEditing && (
            <div className="action-buttons mt-1">
              <button type="submit" className="primary-btn">Save Changes</button>
              <button type="button" onClick={() => {
                setIsEditing(false);
                setErrors({});
                setServerError('');
              }} className="secondary-btn">Cancel</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}