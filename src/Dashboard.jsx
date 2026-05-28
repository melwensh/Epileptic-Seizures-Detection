import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients, deletePatient } from './dataService';

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { setPatients(getPatients()); }, []);

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete ${name} and ALL their EEG records?`)) {
      deletePatient(id);
      setPatients(getPatients()); 
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Doctor Dashboard</h1>
          <p className="subtitle">Select a patient to view their EEG history</p>
        </div>
        <button onClick={() => navigate('/add-patient')} className="primary-btn small-btn">+ Add Patient</button>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Patient Name</th><th>Age</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.id}</strong></td><td>{p.name}</td><td>{p.age}</td>
                <td>
                  <div className="action-buttons" style={{ gap: '0.5rem' }}>
                    <button onClick={() => navigate(`/patient/${p.id}`)} className="primary-btn small-btn">View History</button>
                    <button onClick={() => handleDelete(p.id, p.name)} className="danger-btn small-btn">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}