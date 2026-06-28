import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addPatient, getPatients } from './dataService'; 

export default function AddPatient() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({ name: '', age: '', phone: '' });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({}); // Clear previous errors
    
    // 1. Check if fields are empty
    if (!formData.name || !formData.age || !formData.phone) {
        setErrors({ general: "All fields are required." });
        return;
    }

    // 2. STRICT EGYPTIAN PHONE VALIDATION
    const egPhoneRegex = /^01[0125][0-9]{8}$/;
    
    if (!egPhoneRegex.test(formData.phone)) {
        setErrors({ general: "Please enter a valid Egyptian phone number (11 digits starting with 010, 011, 012, or 015)." });
        return;
    }
    
    // 3. UPDATED DUPLICATE VALIDATION: ONLY CHECK PHONE NUMBER
    const currentPatients = getPatients(); 
    
    const isDuplicate = currentPatients.some(patient => 
      patient.phone === formData.phone.trim()
    );

    if (isDuplicate) {
        setErrors({ general: "A patient with this exact phone number is already registered in your clinic." });
        return;
    }
    
    // 4. Save the data
    addPatient(formData);
    navigate('/dashboard');
  };

  return (
    <div className="form-page">
      <div className="form-box">
        <h2>Add Patient</h2>
        
        {errors.general && <span className="error-text" style={{ display: 'block', marginBottom: '1rem', color: '#dc2626', fontWeight: '500', background: '#fee2e2', padding: '0.75rem', borderRadius: '6px' }}>{errors.general}</span>}
        
        <form onSubmit={handleSubmit}>
          
          <div className="input-group">
            <input 
              type="text" 
              placeholder="Full Name" 
              className="input-field" 
              onChange={e => {
                setFormData({...formData, name: e.target.value});
                setErrors({}); 
              }} 
              required 
            />
          </div>
          
          <div className="input-group">
            <input 
              type="number" 
              placeholder="Age" 
              className="input-field" 
              min="0"
              max="120"
              onChange={e => {
                setFormData({...formData, age: e.target.value});
                setErrors({}); 
              }} 
              required 
            />
          </div>

          <div className="input-group">
            <input 
              type="tel" 
              placeholder="Phone Number (e.g., 01012345678)" 
              className="input-field" 
              maxLength="11"
              onChange={e => {
                setFormData({...formData, phone: e.target.value});
                setErrors({}); 
              }} 
              required 
            />
          </div>
          
          <div className="action-buttons mt-1">
            <button type="submit" className="primary-btn">Save Patient</button>
            <button type="button" onClick={() => navigate('/dashboard')} className="secondary-btn">Cancel</button>
          </div>
          
        </form>
      </div>
    </div>
  );
}