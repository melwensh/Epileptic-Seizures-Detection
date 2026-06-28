import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientById, getRecordsByPatient, deleteRecord } from './dataService';
import './styles.css';

export default function PatientRecordList() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    setPatient(getPatientById(id));
    setRecords(getRecordsByPatient(id));
  }, [id]);

  if (!patient) return <div className="dashboard-page">Patient not found</div>;

  return (
    <div className="dashboard-page">
      
      {/* HEADER */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Analysis History: {patient.name}</h1>
          <p className="subtitle">ID: {patient.id} | Age: {patient.age} | Phone: {patient.phone || 'N/A'}</p>
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => navigate(`/patient/${id}/summary`)} 
            className="primary-btn small-btn" 
            style={{ background: '#4f46e5' }}
          >
            📄 Generate Report
          </button>
          <button onClick={() => navigate('/dashboard')} className="secondary-btn small-btn">
            &larr; Dashboard
          </button>
        </div>
      </div>
      
      {/* HISTORY TABLE */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>Record ID</th><th>Date</th><th>File</th><th>Diagnosis</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {records.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding:'3rem', color: '#64748b'}}>No records found for this patient.</td></tr>}
            {records.map((r) => {
              
              // --- SMART LOGIC FOR ICTAL / INTERICTAL BADGE ---
              const isAbnormal = r.status === 'ABNORMAL' || r.analysis?.status === 'ABNORMAL';
              const seizureWindows = r.analysis?.seizureWindows || 0;
              
              let badgeText = 'NORMAL';
              let badgeBg = '#d1fae5';     
              let badgeColor = '#065f46';  

              if (isAbnormal) {
                if (seizureWindows > 0) {
                  badgeText = 'ICTAL';
                  badgeBg = '#fef2f2';     
                  badgeColor = '#991b1b';  
                } else {
                  badgeText = 'INTERICTAL';
                  badgeBg = '#fefce8';     
                  badgeColor = '#854d0e';  
                }
              }

              return (
                <tr key={r.id}>
                  <td><strong>{r.id}</strong></td>
                  <td>{r.date}</td>
                  <td>{r.fileName}</td>
                  <td>
                    {/* DYNAMIC COLORED BADGE */}
                    <span style={{ 
                      padding: '6px 12px', 
                      borderRadius: '6px', 
                      fontWeight: '700', 
                      fontSize: '0.85rem', 
                      background: badgeBg, 
                      color: badgeColor,
                      letterSpacing: '0.5px'
                    }}>
                      {badgeText}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons" style={{ gap: '0.5rem' }}>
                      <button onClick={() => navigate(`/record/${r.id}`)} className="primary-btn small-btn">View Analysis</button>
                      <button onClick={() => { 
                        deleteRecord(r.id); 
                        setRecords(getRecordsByPatient(id)); 
                        if (getRecordsByPatient(id).length === 0) {
                          navigate('/dashboard');
                        }
                      }} className="danger-btn small-btn">Delete Record</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}