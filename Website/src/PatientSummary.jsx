import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPatientById, getRecordsByPatient, getActiveDoctorSession } from './dataService';

export default function PatientSummary() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [doctor, setDoctor] = useState(null);

  useEffect(() => {
    setPatient(getPatientById(id));
    setRecords(getRecordsByPatient(id));
    setDoctor(getActiveDoctorSession());
  }, [id]);

  if (!patient) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Loading Patient Data...</div>;

  const totalScans = records.length;
  let ictalScans = 0;
  let interictalScans = 0;
  let normalScans = 0;
  let totalConfidence = 0;
  let totalWindowsAllScans = 0;
  let totalFNSZ = 0, totalGNSZ = 0, totalCPSZ = 0;

  records.forEach(r => {
    const isAbnormal = r.status === 'ABNORMAL' || r.analysis?.status === 'ABNORMAL';
    const szWindows = r.analysis?.seizureWindows || 0;
    
    if (isAbnormal) {
      if (szWindows > 0) ictalScans++;
      else interictalScans++;
    } else {
      normalScans++;
    }

    if (r.analysis) {
      totalConfidence += r.analysis.confidence || 0;
      totalWindowsAllScans += r.analysis.totalWindows || 0;
      if (r.analysis.summary) {
        totalFNSZ += r.analysis.summary.FNSZ || 0;
        totalGNSZ += r.analysis.summary.GNSZ || 0;
        totalCPSZ += r.analysis.summary.CPSZ || 0;
      }
    }
  });

  const avgConfidence = totalScans > 0 ? (totalConfidence / totalScans).toFixed(1) : 0;
  const totalSeizureWindows = totalFNSZ + totalGNSZ + totalCPSZ;
  const burdenPercentage = totalWindowsAllScans > 0 ? ((totalSeizureWindows / totalWindowsAllScans) * 100).toFixed(2) : 0;
  
  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const totalMonitoredTime = formatTime(totalWindowsAllScans * 10);
  const totalSeizureBurden = formatTime(totalSeizureWindows * 10);
  const isCompletelyNormal = ictalScans === 0 && interictalScans === 0;

 let aiSummaryText = "No data available for clinical review.";
if (totalScans > 0) {
  if (isCompletelyNormal) {
    aiSummaryText = `Review of the ${totalMonitoredTime} EEG monitoring period across ${totalScans} sessions shows no evidence of ictal or interictal epileptiform activity. Current findings are within normal limits (Confidence Score: ${avgConfidence}%).`;
  } else if (totalSeizureWindows === 0 && interictalScans > 0) {
    aiSummaryText = `Patient underwent ${totalMonitoredTime} of EEG monitoring. No active clinical seizures were identified; however, ${interictalScans} scan(s) displayed epileptiform discharges consistent with an INTERICTAL state.`;
  } else {
    let dominant = "Focal Non-motor (FNSZ)";
    let maxT = totalFNSZ;
    if (totalGNSZ > maxT) { dominant = "Generalized (GNSZ)"; maxT = totalGNSZ; }
    if (totalCPSZ > maxT) { dominant = "Complex Partial (CPSZ)"; }

    aiSummaryText = `Abnormal EEG findings observed over ${totalMonitoredTime} of monitoring. The patient exhibited a calculated Seizure Burden of ${burdenPercentage}% (${totalSeizureBurden} total duration). Active seizures were detected in ${ictalScans} scan(s), with a predominant typology of ${dominant}.`;
  }
}

  const reportDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const handlePrint = () => {
    const printContent = document.getElementById('printable-report').innerHTML;
    const printWindow = window.open('', '_blank', 'width=1200,height=900');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Clinical_Report_${patient.id}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { 
              font-family: 'Inter', Arial, sans-serif; 
              margin: 0; 
              padding: 40px; 
              color: #0f172a; 
              background: #fff;
              -webkit-print-color-adjust: exact !important; 
              print-color-adjust: exact !important; 
            }
            @page { size: A4; margin: 15mm; }
            * { box-sizing: border-box; }
            .prevent-break { page-break-inside: avoid; break-inside: avoid; }
            table { page-break-inside: auto; width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 0.9rem; }
            th, td { padding: 12px 16px; border-bottom: 1px solid #e2e8f0; text-align: left; }
            th { color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 0.5px; border-bottom: 2px solid #cbd5e1; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            .badge { padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; letter-spacing: 0.5px; }
            .bg-normal { background: #d1fae5; color: #065f46; }
            .bg-ictal { background: #fee2e2; color: #991b1b; }
            .bg-interictal { background: #fefce8; color: #a16207; }
            
            .grid-header { display: flex; justify-content: space-between; align-items: flex-end; }
            .header-text { text-align: right; }
            .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
            .grid-4-col { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
            .grid-5-col { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; }
            .grid-3-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
            .table-responsive { overflow-x: visible; }
          </style>
        </head>
        <body>
          ${printContent}
          <script>
            setTimeout(function() { window.print(); window.close(); }, 300);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem', fontFamily: "'Inter', Arial, sans-serif" }}>
      
      <style>
        {`
          .grid-header { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 1rem; }
          .header-text { text-align: right; }
          .grid-2-col { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
          .grid-4-col { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
          .grid-5-col { display: grid; grid-template-columns: repeat(5, 1fr); gap: 1rem; }
          .grid-3-col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
          .table-responsive { width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
          
          @media (max-width: 1024px) {
            .grid-5-col { grid-template-columns: repeat(3, 1fr); }
            .grid-3-col { grid-template-columns: repeat(2, 1fr); }
          }
          
          @media (max-width: 768px) {
            .grid-2-col, .grid-4-col, .grid-5-col, .grid-3-col { grid-template-columns: 1fr; }
            .grid-header { flex-direction: column; align-items: flex-start; }
            .header-text { text-align: left; }
          }
        `}
      </style>

      <div className="no-print grid-header" style={{ marginBottom: '2rem', background: '#fff', padding: '1rem 2rem', borderRadius: '12px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ background: '#f1f5f9', color: '#0f172a', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
          Back to Dashboard
        </button>
        <button onClick={handlePrint} style={{ background: '#4f46e5', color: '#ffffff', border: 'none', padding: '10px 24px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', gap: '8px', alignItems: 'center' }}>
          Export PDF Report
        </button>
      </div>

      <div id="printable-report" style={{ background: '#ffffff', padding: '20px 0', color: '#0f172a' }}>
        
        <div className="grid-header" style={{ borderBottom: '3px solid #0f172a', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ marginLeft: '2rem', fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px' }}>
              <span style={{ color: '#0f172a' }}>Epi</span><span style={{ color: '#4f46e5' }}>Detect</span>
            </h1>
          </div>
          <div className="header-text">
            <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '4px' ,marginRight: '2rem' , marginLeft: '2rem'}}>Date Generated: <strong style={{ color: '#0f172a' }}>{reportDate}</strong></div>
            <div style={{ fontSize: '0.9rem', color: '#64748b' ,marginRight: '2rem', marginLeft: '2rem'}}>Attending Physician: <strong style={{ color: '#0f172a' }}>Dr. {doctor?.name}</strong></div>
          </div>
        </div>
        
        <div style={{ 
          background: '#ffffff', 
          padding: '2rem', 
          borderRadius: '12px', 
          border: '1px solid #e2e8f0', 
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <h2 style={{ margin: '0 0 1.5rem 0', fontSize: '1.75rem', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
            Patient Clinical Profile
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Full Name</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#0f172a' }}>{patient.name}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Patient ID</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155' }}>{patient.id}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Age</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155' }}>{patient.age} years</div>
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Contact Number</div>
              <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#334155' }}>{patient.phone || 'N/A'}</div>
            </div>
          </div>
        </div>
        <div style={{ background: '#eff6ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bfdbfe', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Clinical Summary
          </h3>
          <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.6', color: '#1e3a8a', fontWeight: '500' }}>
            {aiSummaryText}
          </p>
        </div>

        <h3 style={{ fontSize: '1.1rem', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1.5rem' }}>Global Clinical Metrics</h3>
        
        {isCompletelyNormal ? (
          <div className="prevent-break grid-3-col" style={{ marginBottom: '2.5rem' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1.5rem 1rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>TOTAL MONITORED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>{totalMonitoredTime}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1.5rem 1rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>TOTAL SCANS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981' }}>{totalScans}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1.5rem 1rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>AVG CONFIDENCE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>{avgConfidence}%</div>
            </div>
          </div>
        ) : (
          <div className="prevent-break grid-5-col" style={{ marginBottom: '2.5rem' }}>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1.5rem 1rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>TOTAL MONITORED</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' }}>{totalMonitoredTime}</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1.5rem 1rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>SEIZURE BURDEN</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#ef4444' }}>{burdenPercentage}%</div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1.5rem 1rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>ICTAL SCANS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b91c1c' }}>{ictalScans} <span style={{fontSize:'1rem', color:'#94a3b8', fontWeight:'500'}}>/ {totalScans}</span></div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1.5rem 1rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>INTERICTAL SCANS</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#d97706' }}>{interictalScans} <span style={{fontSize:'1rem', color:'#94a3b8', fontWeight:'500'}}>/ {totalScans}</span></div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', padding: '1.5rem 1rem', borderRadius: '12px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px' }}>AVG CONFIDENCE</div>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#10b981' }}>{avgConfidence}%</div>
            </div>
          </div>
        )}

        {!isCompletelyNormal && totalSeizureWindows > 0 && (
          <div className="prevent-break" style={{ marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Detected Typology (Total Time)</h3>
            <div className="grid-3-col">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff7ed', border: '1px solid #ffedd5', borderLeft: '5px solid #ea580c', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#9a3412' }}>FNSZ <span style={{fontWeight:'500', color:'#ea580c'}}>| Focal Non-motor</span></div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#c2410c' }}>{formatTime(totalFNSZ * 10)}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2', border: '1px solid #fee2e2', borderLeft: '5px solid #ef4444', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#991b1b' }}>GNSZ <span style={{fontWeight:'500', color:'#ef4444'}}>| Generalized</span></div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#b91c1c' }}>{formatTime(totalGNSZ * 10)}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f5f3ff', border: '1px solid #ede9fe', borderLeft: '5px solid #8b5cf6', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#5b21b6' }}>CPSZ <span style={{fontWeight:'500', color:'#8b5cf6'}}>| Complex Partial</span></div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#6d28d9' }}>{formatTime(totalCPSZ * 10)}</div>
              </div>
            </div>
          </div>
        )}

        <div className="prevent-break" style={{ marginBottom: '3rem' }}>
          <h3 style={{ fontSize: '1.1rem', color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Chronological Scan History</h3>
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#64748b' }}>Record ID</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#64748b' }}>Date Uploaded</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'left', color: '#64748b' }}>Source File</th>
                  <th style={{ padding: '12px', borderBottom: '2px solid #cbd5e1', textAlign: 'right', color: '#64748b' }}>Clinical Diagnosis</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>No scans recorded.</td></tr>
                ) : (
                  records.map((r, i) => {
                    const isAbnormal = r.status === 'ABNORMAL' || r.analysis?.status === 'ABNORMAL';
                    const szWindows = r.analysis?.seizureWindows || 0;
                    
                    let badgeText = 'NORMAL';
                    let badgeClass = 'bg-normal';
                    let localStyle = { background: '#d1fae5', color: '#065f46' };

                    if (isAbnormal) {
                      if (szWindows > 0) {
                        badgeText = 'ICTAL';
                        badgeClass = 'bg-ictal';
                        localStyle = { background: '#fee2e2', color: '#991b1b' };
                      } else {
                        badgeText = 'INTERICTAL';
                        badgeClass = 'bg-interictal';
                        localStyle = { background: '#fefce8', color: '#a16207' };
                      }
                    }

                    return (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontWeight: '600' }}>{r.id}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0' }}>{r.date}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', fontFamily: 'monospace', color: '#475569' }}>{r.fileName}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                          <span className={`badge ${badgeClass}`} style={{ ...localStyle, padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                            {badgeText}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="prevent-break grid-2-col" style={{ marginTop: '2rem' }}>
          <div>
            <h3 style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Physician Clinical Notes</h3>
            <div style={{ borderBottom: '1px solid #cbd5e1', height: '30px', marginBottom: '10px' }}></div>
            <div style={{ borderBottom: '1px solid #cbd5e1', height: '30px', marginBottom: '10px' }}></div>
            <div style={{ borderBottom: '1px solid #cbd5e1', height: '30px', marginBottom: '10px' }}></div>
            <div style={{ borderBottom: '1px solid #cbd5e1', height: '30px' }}></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '2rem' }}>
            <div style={{ borderBottom: '1px solid #0f172a', width: '100%', maxWidth: '300px', height: '40px', marginBottom: '8px' }}></div>
            <div style={{ fontSize: '1.1rem', color: '#0f172a', fontWeight: '700' }}>Dr. {doctor?.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>Attending Neurologist</div>
          </div>
        </div>
      </div>
    </div>
  );
}