import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientById, getRecordsByPatient, deleteRecord, addRecord } from './dataService';
import './styles.css';

export default function PatientHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    setPatient(getPatientById(id));
    setRecords(getRecordsByPatient(id));
  }, [id]);

  const handleFileSelect = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setApiError(''); 
    }
  };

  const handleAnalyzeAndSave = async () => {
    if (!file) return alert("Please select an EDF file first.");
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    setApiError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/analyze', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred');
      }

      addRecord({
        patientId: id,
        date: new Date().toLocaleDateString(),
        fileName: file.name,
        status: data.status,
        analysis: data 
      });
      
      setRecords(getRecordsByPatient(id));
      setIsAnalyzing(false);
      setShowModal(false);
      setFile(null);

    } catch (error) {
      console.error("AI Analysis Failed:", error);
      setApiError(error.message);
      setIsAnalyzing(false);
    }
  };

  if (!patient) return <div className="dashboard-page">Patient not found</div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>History: {patient.name}</h1>
          <p className="subtitle">ID: {patient.id} | Age: {patient.age}</p>
        </div>
        <div style={{display:'flex', gap:'10px'}}>
            <button onClick={() => navigate('/dashboard')} className="secondary-btn small-btn">Back</button>
            <button onClick={() => setShowModal(true)} className="primary-btn small-btn">Create Record</button>
        </div>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>Record ID</th><th>Date</th><th>File</th><th>Diagnosis</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {records.length === 0 && <tr><td colSpan="5" style={{textAlign:'center', padding:'3rem', color: '#64748b'}}>No records found. Create a record to begin.</td></tr>}
            {records.map((r) => (
              <tr key={r.id}>
                <td><strong>{r.id}</strong></td>
                <td>{r.date}</td>
                <td>{r.fileName}</td>
                <td><span className={r.status === 'ABNORMAL' ? 'alert-text' : 'normal-text'}>{r.status}</span></td>
                <td>
                  <div className="action-buttons" style={{ gap: '0.5rem' }}>
                    <button onClick={() => navigate(`/record/${r.id}`)} className="primary-btn small-btn">View Analysis</button>
                    <button onClick={() => { deleteRecord(r.id); setRecords(getRecordsByPatient(id)); }} className="danger-btn small-btn">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- PIXEL PERFECT UI MODAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1.5rem'}}>Create Record</h2>
            <p style={{color: '#64748b', margin: '0 0 1.5rem 0', fontSize: '0.9rem'}}>Upload patient EEG data for AI analysis.</p>

            {apiError && (
              <div style={{background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid #fecaca'}}>
                <strong>Analysis Failed:</strong> {apiError}
              </div>
            )}

            <div className="input-group">
              <label className="input-label" style={{color: '#334155'}}>Patient ID</label>
              <input 
                type="text" 
                className="input-field" 
                value={patient.id} 
                readOnly 
                style={{backgroundColor: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'not-allowed'}} 
              />
            </div>

            <div className="input-group" style={{marginTop: '1.5rem'}}>
              <label className="input-label" style={{color: '#334155'}}>Upload EEG File (.edf)</label>
              <div className="upload-drop-zone">
                <input type="file" accept=".edf" onChange={handleFileSelect} disabled={isAnalyzing} />
                
                <div className="upload-icon-wrapper">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path>
                    <path d="M12 15v-8"></path>
                    <path d="m9 10 3-3 3 3"></path>
                  </svg>
                </div>

                {file ? (
                  <h3 style={{color: '#3b82f6', margin:0, fontSize: '1rem'}}>{file.name}</h3>
                ) : (
                  <>
                    <p style={{margin: '0 0 0.25rem 0', color: '#0f172a', fontWeight: '500', fontSize: '0.95rem'}}>
                      <span style={{color: '#3b82f6', fontWeight: '600'}}>Click to upload</span> or drag and drop
                    </p>
                    <p style={{margin: 0, color: '#94a3b8', fontSize: '0.85rem'}}>EDF files only (max. 50MB)</p>
                  </>
                )}
              </div>
            </div>

            {isAnalyzing ? (
              <div style={{marginTop: '1.5rem', textAlign: 'center'}}>
                <div style={{fontWeight: '600', color: '#3b82f6', fontSize: '0.95rem', marginBottom: '1rem'}}>
                  🧠 Sending to AI Models for Analysis...
                </div>
                <div style={{width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden'}}>
                  <div style={{width: '50%', height: '100%', background: '#3b82f6', animation: 'slide 1.5s infinite linear'}}></div>
                </div>
                <style>{`@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
              </div>
            ) : (
              <div className="action-buttons mt-1" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem'}}>
                <button onClick={() => {setShowModal(false); setFile(null); setApiError('');}} className="secondary-btn" style={{fontWeight: '500'}}>Cancel</button>
                <button onClick={handleAnalyzeAndSave} className="primary-btn" disabled={!file} style={{fontWeight: '500'}}>Create Record</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}