import { useParams, useNavigate } from 'react-router-dom';
import { getRecordById } from './dataService';
import './styles.css';

export default function RecordView() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const record = getRecordById(recordId);

  // Fallback if data is missing
  if (!record || !record.analysis) {
    return (
      <div className="dashboard-page" style={{ padding: '3rem', textAlign: 'center' }}>
        <h3 style={{ color: '#64748b' }}>Record or analysis data not found.</h3>
        <p>Please delete this record and upload the file again.</p>
        <button onClick={() => navigate(-1)} className="secondary-btn mt-1">Go Back</button>
      </div>
    );
  }

  const data = record.analysis;
  const isAbnormal = record.status === 'ABNORMAL';
  
  // Calculate total seconds (Total Windows * 10 = total seconds)
  const totalDurationSeconds = data.totalWindows * 10; 

  return (
    <div className="dashboard-page" style={{ maxWidth: '1200px', margin: '0 auto', padding: '1rem 2rem 3rem 2rem' }}>
      
      {/* Navigation & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button onClick={() => navigate(-1)} className="secondary-btn small-btn" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span>&larr;</span> Back to History
        </button>
        <div style={{ textAlign: 'right' }}>
          <strong style={{ fontSize: '1.2rem', color: '#0f172a', display: 'block' }}>{record.fileName}</strong>
          <span style={{ fontSize: '0.9rem', color: '#64748b' }}>Uploaded: {record.date}</span>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', marginBottom: '2rem' }} />

      {/* 1. TOP METRICS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🧠 Diagnosis
          </p>
          <h1 style={{ margin: '0.5rem 0 0 0', fontSize: '2.5rem', color: isAbnormal ? '#ef4444' : '#10b981', lineHeight: '1.2' }}>
            {record.status}
          </h1>
        </div>
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🎯 Max Confidence
          </p>
          <h1 style={{ margin: '0.5rem 0 0 0', fontSize: '2.5rem', color: '#0f172a', lineHeight: '1.2' }}>
            {data.confidence}%
          </h1>
        </div>
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            📊 Windows Analysed
          </p>
          <h1 style={{ margin: '0.5rem 0 0 0', fontSize: '2.5rem', color: '#0f172a', lineHeight: '1.2' }}>
            {data.totalWindows}
          </h1>
        </div>
      </div>

      {/* 2. ALERTS */}
      {isAbnormal ? (
        <div style={{ marginBottom: '3rem' }}>
          <div style={{ background: '#fefce8', borderLeft: '5px solid #eab308', color: '#854d0e', padding: '1.2rem 1.5rem', borderRadius: '8px', marginBottom: '0.75rem', fontWeight: '500', fontSize: '1.05rem' }}>
            ⚠️ Abnormal activity detected! Scanning for Seizures...
          </div>
          <div style={{ background: '#eff6ff', borderLeft: '5px solid #3b82f6', color: '#1e40af', padding: '1.2rem 1.5rem', borderRadius: '8px', marginBottom: '0.75rem', fontWeight: '500', fontSize: '1.05rem' }}>
            🔍 Stage 2: {data.totalWindows} windows analysed | threshold = 0.2410 | seizure windows = {data.seizureWindows}
          </div>
          
          {data.seizureWindows > 0 ? (
            <div style={{ background: '#fef2f2', borderLeft: '5px solid #ef4444', color: '#991b1b', padding: '1.2rem 1.5rem', borderRadius: '8px', fontWeight: '500', fontSize: '1.05rem' }}>
              🚨 {data.seizureWindows} Seizure segments found! Classifying types...
            </div>
          ) : (
            <div style={{ background: '#eff6ff', borderLeft: '5px solid #3b82f6', color: '#1e40af', padding: '1.2rem 1.5rem', borderRadius: '8px', fontWeight: '500', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{width: '16px', height: '16px', background: '#3b82f6', borderRadius: '4px'}}></div>
              Abnormal brain waves found, but NO epileptic seizures detected.
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: '#ecfdf5', borderLeft: '5px solid #10b981', color: '#065f46', padding: '1.2rem 1.5rem', borderRadius: '8px', marginBottom: '3rem', fontWeight: '500', fontSize: '1.05rem' }}>
          ✅ Patient EEG scans are normal. No seizure windows detected.
        </div>
      )}

      {/* ONLY SHOW DETAILED SEIZURE UI IF THERE ARE ACTUAL SEIZURES (> 0) */}
      {isAbnormal && data.episodes && data.episodes.length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '3rem 0' }} />

          {/* 3. EXACT TIMELINE SIMULATOR */}
          <div style={{ marginBottom: '4rem' }}>
            <h2 style={{ color: '#0f172a', marginBottom: '0.5rem', textAlign: 'center' }}>📊 Clinical Seizure Timeline</h2>
            <p style={{ color: '#64748b', marginTop: 0, marginBottom: '1.5rem', textAlign: 'center' }}>Visual representation of seizure occurrences throughout the EEG recording.</p>
            
            <div style={{ 
              width: '100%', 
              height: '60px', 
              position: 'relative', 
              borderRadius: '8px', 
              overflow: 'hidden', 
              backgroundColor: '#3b82f6', 
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
              border: '1px solid #e2e8f0'
            }}>
              
              {data.episodes.map((ep, index) => {
                const durationSec = parseInt(ep.duration.match(/\d+/)[0], 10);
                const leftPercent = (ep.start / totalDurationSeconds) * 100;
                const widthPercent = (durationSec / totalDurationSeconds) * 100;
                
                return (
                  <div 
                    key={index} 
                    style={{ 
                      position: 'absolute',
                      top: 0,
                      bottom: 0,
                      left: `${leftPercent}%`,
                      width: `${widthPercent}%`, 
                      background: ep.color,
                      borderRight: '1px solid rgba(255,255,255,0.4)',
                      borderLeft: '1px solid rgba(255,255,255,0.4)',
                      zIndex: 10
                    }}
                    title={`${ep.code}: ${ep.start}s to ${ep.end}s (Duration: ${durationSec}s)`}
                  ></div>
                )
              })}
            </div>
            
            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: '600', color: '#64748b' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#3b82f6' }}></div> NON-Seizure
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: '600', color: '#64748b' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#f97316' }}></div> FNSZ
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: '600', color: '#64748b' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#ef4444' }}></div> GNSZ
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem', fontWeight: '600', color: '#64748b' }}>
                <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#8b5cf6' }}></div> CPSZ
              </span>
            </div>
          </div>

          {/* 4. SUMMARY BOXES (Perfected Layout) */}
          <h2 style={{ color: '#0f172a', marginBottom: '1.5rem', textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            📈 Seizure Type Summary
          </h2>
          
          {/* Changed flex-basis to 250px so they sit perfectly side-by-side on all screens */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1.5rem', marginBottom: '4rem' }}>
            
            {data.summary.FNSZ > 0 && (
              <div style={{ flex: '1 1 250px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', padding: '2rem 1.5rem', borderRadius: '12px', textAlign:'center', boxShadow: '0 10px 15px -3px rgba(249, 115, 22, 0.4)' }}>
                <h3 style={{ margin:0, fontSize: '1.05rem', fontWeight:'600', opacity: 0.95, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'rgba(255,255,255,0.6)', boxShadow: '0 0 6px rgba(255,255,255,0.4)'}}></div>
                  FNSZ — Focal Non-motor
                </h3>
                {/* Replaced <h1> with a strictly spaced <span> to prevent overlapping */}
                <div style={{ margin: '1rem 0 0.25rem 0' }}>
                  <span style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1' }}>{data.summary.FNSZ}</span>
                </div>
                <p style={{ margin:0, fontSize: '1rem', fontWeight: '500', opacity: 0.9 }}>windows</p>
              </div>
            )}

            {data.summary.GNSZ > 0 && (
              <div style={{ flex: '1 1 250px', background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: 'white', padding: '2rem 1.5rem', borderRadius: '12px', textAlign:'center', boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.4)' }}>
                <h3 style={{ margin:0, fontSize: '1.05rem', fontWeight:'600', opacity: 0.95, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'rgba(255,255,255,0.6)', boxShadow: '0 0 6px rgba(255,255,255,0.4)'}}></div>
                  GNSZ — Generalized
                </h3>
                <div style={{ margin: '1rem 0 0.25rem 0' }}>
                  <span style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1' }}>{data.summary.GNSZ}</span>
                </div>
                <p style={{ margin:0, fontSize: '1rem', fontWeight: '500', opacity: 0.9 }}>windows</p>
              </div>
            )}

            {data.summary.CPSZ > 0 && (
              <div style={{ flex: '1 1 250px', background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: 'white', padding: '2rem 1.5rem', borderRadius: '12px', textAlign:'center', boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.4)' }}>
                <h3 style={{ margin:0, fontSize: '1.05rem', fontWeight:'600', opacity: 0.95, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  <div style={{width:'12px', height:'12px', borderRadius:'50%', background:'rgba(255,255,255,0.6)', boxShadow: '0 0 6px rgba(255,255,255,0.4)'}}></div>
                  CPSZ — Complex Partial
                </h3>
                <div style={{ margin: '1rem 0 0.25rem 0' }}>
                  <span style={{ fontSize: '3.5rem', fontWeight: 'bold', lineHeight: '1' }}>{data.summary.CPSZ}</span>
                </div>
                <p style={{ margin:0, fontSize: '1rem', fontWeight: '500', opacity: 0.9 }}>windows</p>
              </div>
            )}
          </div>

          {/* 5. EPISODE LIST */}
          <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🚨 Detected Seizure Episodes ({data.episodes.length})
          </h2>
          <div style={{ marginTop: '1.5rem' }}>
            {data.episodes.map((ep) => (
              <div key={ep.id} className="episode-card" style={{ borderLeftColor: ep.color }}>
                <div>
                  <h3 className="episode-title">
                    <span style={{ color: ep.color, marginRight: '8px' }}>●</span>
                    {ep.id}. {ep.code} — {ep.name}
                  </h3>
                  <p className="episode-time">
                    ⏱ From <strong>{ep.start}s</strong> to <strong>{ep.end}s</strong>
                  </p>
                </div>
                <div className="episode-duration">
                  duration: {ep.duration}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}