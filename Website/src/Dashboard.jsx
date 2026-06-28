import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPatients, deletePatient, getActiveDoctorSession, addRecord, getRecordsByPatient } from './dataService';

export default function Dashboard() {
  const [patients, setPatients] = useState([]);
  const [doctorName, setDoctorName] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // NEW: Search state
  const navigate = useNavigate();

  // Modal State for AI Analysis
  const [showModal, setShowModal] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [file, setFile] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => { 
    const activeDoctor = getActiveDoctorSession();
    if (activeDoctor) {
      setDoctorName(activeDoctor.name);
    } else {
      navigate('/');
      return; 
    }

    const loadedPatients = getPatients().map(p => ({
      ...p,
      recordCount: getRecordsByPatient(p.id).length
    }));
    setPatients(loadedPatients); 
  }, [navigate]);

  const handleDelete = (id, name) => {
    if (window.confirm(`Delete ${name} and ALL their EEG records?`)) {
      deletePatient(id);
      
      const loadedPatients = getPatients().map(p => ({
        ...p,
        recordCount: getRecordsByPatient(p.id).length
      }));
      setPatients(loadedPatients); 
    }
  };

  // --- AI RECORD UPLOAD LOGIC ---
  const handleOpenUploadModal = (patientId) => {
    setSelectedPatientId(patientId);
    setShowModal(true);
    setFile(null);
    setApiError('');
  };

  const handleFileSelect = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setApiError(''); 
    }
  };

  const handleAnalyzeAndSave = async () => {
    if (!file) return alert("Please select an EDF file first.");
    
    const patientRecords = getRecordsByPatient(selectedPatientId);
    const isDuplicateFile = patientRecords.some(
      record => record.fileName.toLowerCase() === file.name.toLowerCase()
    );

    if (isDuplicateFile) {
      setApiError(`The file "${file.name}" has already been analyzed for this patient.`);
      return; 
    }

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
      if (!response.ok) throw new Error(data.error || 'Server error occurred');

      addRecord({
        patientId: selectedPatientId,
        date: new Date().toLocaleDateString(),
        fileName: file.name,
        status: data.status,
        analysis: data 
      });
      
      const updatedPatientRecords = getRecordsByPatient(selectedPatientId);
      const newlyCreatedRecord = updatedPatientRecords[updatedPatientRecords.length - 1];
      
      setIsAnalyzing(false);
      setShowModal(false);
      setFile(null);
      
      navigate(`/record/${newlyCreatedRecord.id}`);

    } catch (error) {
      console.error("AI Analysis Failed:", error);
      setApiError(error.message);
      setIsAnalyzing(false);
    }
  };

  // NEW: Filter patients based on the search query
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (p.phone && p.phone.includes(searchQuery)) ||
    String(p.id).includes(searchQuery)
  );

  return (
    <div className="dashboard-page">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Welcome, Dr. {doctorName}</h1>
          <p className="subtitle">Manage your patients and upload EEG files for analysis.</p>
        </div>
        
        {/* NEW: Search Bar and Add Button Container */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Search name, phone, or ID..." 
            className="input-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ margin: 0, minWidth: '250px', padding: '0.6rem 1rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
          <button onClick={() => navigate('/add-patient')} className="primary-btn small-btn" style={{ whiteSpace: 'nowrap' }}>+ Add Patient</button>
        </div>
      </div>
      
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr><th>ID</th><th>Patient Name</th><th>Age</th><th>Phone Number</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {patients.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No patients found. Click "+ Add Patient" to get started.
                </td>
              </tr>
            ) : filteredPatients.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  No patients match your search "{searchQuery}".
                </td>
              </tr>
            ) : (
              filteredPatients.map((p) => (
                <tr key={p.id}>
                  <td><strong>{p.id}</strong></td>
                  <td>{p.name}</td>
                  <td>{p.age}</td>
                  <td>{p.phone || 'N/A'}</td>
                  <td>
                    <div className="action-buttons" style={{ gap: '0.5rem' }}>
                      <button onClick={() => handleOpenUploadModal(p.id)} className="primary-btn small-btn">Add Record</button>
                      
                      <button 
                        onClick={() => navigate(`/patient/${p.id}`)} 
                        className="secondary-btn small-btn"
                        disabled={p.recordCount === 0}
                        style={{ 
                          opacity: p.recordCount === 0 ? 0.5 : 1, 
                          cursor: p.recordCount === 0 ? 'not-allowed' : 'pointer' 
                        }}
                      >
                        History ({p.recordCount})
                      </button>

                      <button onClick={() => handleDelete(p.id, p.name)} className="danger-btn small-btn">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- UPLOAD MODAL --- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '500px', padding: '2rem' }}>
            <h2 style={{margin: '0 0 0.25rem 0', color: '#0f172a', fontSize: '1.5rem'}}>Analyze EEG File</h2>
            <p style={{color: '#64748b', margin: '0 0 1.5rem 0', fontSize: '0.9rem'}}>Upload patient EEG data for AI analysis.</p>

            {apiError && (
              <div style={{background: '#fef2f2', color: '#991b1b', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid #fecaca'}}>
                <strong>Alert:</strong> {apiError}
              </div>
            )}

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
                    <p style={{margin: '0 0 0.25rem 0', color: '#0f172a', fontWeight: '500', fontSize: '0.95rem'}}><span style={{color: '#3b82f6', fontWeight: '600'}}>Click to upload</span> or drag and drop</p>
                    <p style={{margin: 0, color: '#94a3b8', fontSize: '0.85rem'}}>EDF files only (max. 50MB)</p>
                  </>
                )}
              </div>
            </div>

            {isAnalyzing ? (
              <div style={{marginTop: '1.5rem', textAlign: 'center'}}>
                <div style={{fontWeight: '600', color: '#3b82f6', fontSize: '0.95rem', marginBottom: '1rem'}}>🧠 Sending to AI Models for Analysis...</div>
                <div style={{width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden'}}>
                  <div style={{width: '50%', height: '100%', background: '#3b82f6', animation: 'slide 1.5s infinite linear'}}></div>
                </div>
                <style>{`@keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }`}</style>
              </div>
            ) : (
              <div className="action-buttons mt-1" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem'}}>
                <button onClick={() => {setShowModal(false); setFile(null); setApiError('');}} className="secondary-btn" style={{fontWeight: '500'}}>Cancel</button>
                <button onClick={handleAnalyzeAndSave} className="primary-btn" disabled={!file} style={{fontWeight: '500'}}>Analyze & Save</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}