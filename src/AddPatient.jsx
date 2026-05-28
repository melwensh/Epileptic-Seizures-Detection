import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addPatient, getPatients } from './dataService';

export default function AddPatient() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ id: '', name: '', age: '' });
  const [errors, setErrors] = useState({});

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.id || !formData.name || !formData.age) {
        setErrors({ general: "All fields are required" });
        return;
    }
    addPatient(formData);
    navigate('/dashboard');
  };

  return (
    <div className="form-page">
      <div className="form-box">
        <h2>Add Patient</h2>
        {errors.general && <span className="error-text">{errors.general}</span>}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input type="text" placeholder="Patient ID" className="input-field" 
              onChange={e => setFormData({...formData, id: e.target.value})} required />
          </div>
          <div className="input-group">
            <input type="text" placeholder="Full Name" className="input-field" 
              onChange={e => setFormData({...formData, name: e.target.value})} required />
          </div>
          <div className="input-group">
            <input type="number" placeholder="Age" className="input-field" 
              onChange={e => setFormData({...formData, age: e.target.value})} required />
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