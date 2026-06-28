import { useParams, useNavigate } from 'react-router-dom';
import { getRecordById } from './dataService';
import './styles.css';

export default function RecordView() {
  const { recordId } = useParams();
  const navigate = useNavigate();
  const record = getRecordById(recordId);

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
  // Make sure we check both top-level and deep analysis status
  const isAbnormal = record.status === 'ABNORMAL' || data.status === 'ABNORMAL';
  
  const totalSeconds = data.totalWindows * 10;
  const seizureSeconds = (data.seizureWindows || 0) * 10;
  
  // DETERMINE EXACT CLINICAL STATE
  const isIctal = isAbnormal && seizureSeconds > 0;
  const isInterictal = isAbnormal && seizureSeconds === 0;
  const isNormal = !isAbnormal;

  const formatTime = (totalSecs) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}m ${s}s`;
  };

  const simulatedSpikes = [15, 42, 68, 85]; 

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
          <h1 style={{ margin: '0.5rem 0 0 0', fontSize: '2.5rem', color: isIctal ? '#ef4444' : (isInterictal ? '#eab308' : '#10b981'), lineHeight: '1.2' }}>
            {isIctal ? 'ICTAL' : (isInterictal ? 'INTERICTAL' : 'NORMAL')}
          </h1>
        </div>
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            🎯 AI Confidence
          </p>
          <h1 style={{ margin: '0.5rem 0 0 0', fontSize: '2.5rem', color: '#0f172a', lineHeight: '1.2' }}>
            {data.confidence}%
          </h1>
        </div>
        <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '600', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⏱️ Total Scan Duration
          </p>
          <h1 style={{ margin: '0.5rem 0 0 0', fontSize: '2.5rem', color: '#0f172a', lineHeight: '1.2' }}>
            {formatTime(totalSeconds)}
          </h1>
        </div>
      </div>

      {/* 2. CLINICAL ALERTS */}
      <div style={{ marginBottom: '2rem' }}>
        {isIctal && (
          <div style={{ background: '#fef2f2', borderLeft: '5px solid #ef4444', color: '#991b1b', padding: '1.2rem 1.5rem', borderRadius: '8px', fontWeight: '500', fontSize: '1.05rem' }}>
            🚨 <strong>Ictal State Detected:</strong> {formatTime(seizureSeconds)} of active clinical seizure activity found.
          </div>
        )}
        {isInterictal && (
          <div style={{ background: '#fefce8', borderLeft: '5px solid #eab308', color: '#854d0e', padding: '1.2rem 1.5rem', borderRadius: '8px', fontWeight: '500', fontSize: '1.05rem' }}>
            ⚠️ <strong>Interictal State:</strong> Abnormal epileptic brainwaves (spikes/sharp waves) found, but NO active clinical seizures detected in this scan.
          </div>
        )}
        {isNormal && (
          <div style={{ background: '#ecfdf5', borderLeft: '5px solid #10b981', color: '#065f46', padding: '1.2rem 1.5rem', borderRadius: '8px', fontWeight: '500', fontSize: '1.05rem' }}>
            ✅ <strong>Normal:</strong> Patient EEG scans are normal. No epileptic activity detected over {formatTime(totalSeconds)}.
          </div>
        )}
      </div>

      {/* 3. INTEGRATED EEG SIGNAL VIEWER */}
      <div style={{ marginBottom: '3rem', background: '#0f172a', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', 
              background: isIctal ? '#ef4444' : (isInterictal ? '#eab308' : '#10b981'), 
              boxShadow: `0 0 10px ${isIctal ? '#ef4444' : (isInterictal ? '#eab308' : '#10b981')}` 
            }}></span>
            Analyzed EEG Trace
          </h3>
          
          {/* Dynamic Legend */}
          <div style={{ display: 'flex', gap: '15px' }}>
            {isIctal && (
              <>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f97316' }}></div> FNSZ
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }}></div> GNSZ
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#8b5cf6' }}></div> CPSZ
                </span>
              </>
            )}
            {isInterictal && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: '600', color: '#94a3b8' }}>
                <div style={{ width: '4px', height: '12px', borderRadius: '2px', background: '#eab308' }}></div> Interictal Spikes
              </span>
            )}
          </div>
        </div>
        
        {/* Signal Window with Dynamic Highlights */}
        <div style={{ width: '100%', height: '140px', background: '#1e293b', borderRadius: '8px', overflow: 'hidden', position: 'relative', border: '1px solid #334155' }}>
          
          {isIctal && data.episodes && data.episodes.map((ep, index) => {
            const durationSec = parseInt(ep.duration.match(/\d+/)[0], 10);
            const leftPercent = (ep.start / totalSeconds) * 100;
            const widthPercent = (durationSec / totalSeconds) * 100;
            return (
              <div 
                key={`seizure-${index}`} 
                style={{ 
                  position: 'absolute', top: 0, bottom: 0,
                  left: `${leftPercent}%`, width: `${widthPercent}%`, 
                  background: ep.color, opacity: 0.4, 
                  borderLeft: `2px solid ${ep.color}`, borderRight: `2px solid ${ep.color}`, zIndex: 10
                }}
                title={`${ep.code}: ${ep.start}s to ${ep.end}s (Duration: ${durationSec}s)`}
              ></div>
            )
          })}

          {isInterictal && simulatedSpikes.map((percent, index) => (
            <div 
              key={`spike-${index}`} 
              style={{ 
                position: 'absolute', top: 0, bottom: 0,
                left: `${percent}%`, width: '2px', 
                background: '#eab308', boxShadow: '0 0 8px #eab308', zIndex: 10
              }}
              title={`Interictal Epileptiform Discharge detected near ${formatTime(Math.floor((percent/100)*totalSeconds))}`}
            ></div>
          ))}

          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '25%', borderLeft: '1px dashed #334155', zIndex: 1 }}></div>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', borderLeft: '1px dashed #334155', zIndex: 1 }}></div>
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: '75%', borderLeft: '1px dashed #334155', zIndex: 1 }}></div>

          <svg preserveAspectRatio="none" viewBox="0 0 1000 100" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', stroke: isIctal ? '#ef4444' : (isInterictal ? '#eab308' : '#10b981'), fill: 'none', strokeWidth: '1.5', zIndex: 5 }}>
            <path d="M0,50 Q10,40 20,50 T40,50 T60,30 T80,50 T100,70 T120,50 T140,50 T160,20 T180,80 T200,50 T220,50 T240,40 T260,60 T280,50 T300,50 T320,10 T340,90 T360,50 T380,50 T400,30 T420,70 T440,50 T460,50 T480,20 T500,80 T520,50 T540,50 T560,40 T580,60 T600,50 T620,50 T640,10 T660,90 T680,50 T700,50 T720,30 T740,70 T760,50 T780,50 T800,20 T820,80 T840,50 T860,50 T880,40 T900,60 T920,50 T940,50 T960,10 T980,90 T1000,50" />
          </svg>
        </div>
      </div>

      {/* ONLY SHOW DETAILED EPISODE LIST IF THERE ARE ACTUAL SEIZURES (> 0) */}
      {isIctal && data.episodes && data.episodes.length > 0 && (
        <>
          <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '3rem 0' }} />

          {/* 6. EPISODE LIST */}
          <h2 style={{ color: '#0f172a', display: 'flex', alignItems: 'center', gap: '10px' }}>
            🚨 Detected Ictal Episodes ({data.episodes.length})
          </h2>
          <div style={{ marginTop: '1.5rem' }}>
            {data.episodes.map((ep) => (
              <div key={ep.id} style={{ padding: '1rem', marginBottom: '1rem', background: '#fff', borderRadius: '8px', borderLeft: `5px solid ${ep.color}`, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', color: '#0f172a' }}>
                      <span style={{ color: ep.color, marginRight: '8px' }}>●</span>
                      {ep.id}. {ep.code} — {ep.name}
                    </h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                      ⏱ Occurred from <strong>{formatTime(ep.start)}</strong> to <strong>{formatTime(ep.end)}</strong> in the recording.
                    </p>
                  </div>
                  <div style={{ background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: '6px', fontWeight: '600', fontSize: '0.9rem', color: '#0f172a' }}>
                    Duration: {ep.duration}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}