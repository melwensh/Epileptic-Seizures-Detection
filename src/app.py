import os
import pickle
import numpy as np
import scipy.signal
import scipy.stats
import mne
import tensorflow as tf
from flask import Flask, request, jsonify
from flask_cors import CORS
import warnings

# Suppress warnings
warnings.filterwarnings('ignore')
mne.set_log_level('ERROR')

app = Flask(__name__)
CORS(app)  # Allows React frontend to talk to Python backend

# =================================================================
# 1. CONSTANTS & CONFIGURATION
# =================================================================
S1_CHANNELS = ['FP1', 'FP2', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4', 'O1', 'O2', 'F7', 'F8', 'T3', 'T4', 'T5', 'T6', 'FZ', 'CZ', 'PZ']
S2_S3_CHANNELS = ['FP1', 'FP2', 'F3', 'F4', 'C3', 'C4', 'P3', 'P4', 'O1', 'O2', 'F7', 'F8', 'T3', 'T4', 'T5', 'T6', 'A1', 'A2', 'FZ', 'CZ']

SPATIAL_MAP = {
    (0,1): 0,  (0,2): 18, (0,3): 1,
    (1,0): 10, (1,1): 2,  (1,3): 3,  (1,4): 11,
    (2,0): 12, (2,1): 4,  (2,2): 19, (2,3): 5,  (2,4): 13,
    (3,0): 14, (3,1): 6,  (3,3): 7,  (3,4): 15,
    (4,0): 16, (4,1): 8,  (4,3): 9,  (4,4): 17
}

SFREQ_S1 = 100
WINDOW_SIZE = 60
MAX_MINUTES = 20
SECONDS_PER_WINDOW = 10
TARGET_SFREQ_S2 = 128.0
POINTS_PER_WINDOW = int(10.0 * TARGET_SFREQ_S2)

TYPE_LABELS = { 1: "NON-Seizure", 2: "Focal Non-motor Seizure", 3: "Generalized Seizure", 4: "Complex Partial Seizure" }
TYPE_CODES  = { 1: "NON", 2: "FNSZ", 3: "GNSZ", 4: "CPSZ" }
TYPE_COLORS = { 1: "#3b82f6", 2: "#f97316", 3: "#ef4444", 4: "#8b5cf6" }
S3_TO_APP_MAP = { 0: 4, 1: 2, 2: 3 }

# =================================================================
# 2. HELPER FUNCTIONS (WITH UNBREAKABLE MATH FIX)
# =================================================================
def apply_bandpass(data, fs=100.0):
    nyq = 0.5 * fs
    b, a = scipy.signal.butter(5, [0.5/nyq, 40.0/nyq], btype='band')
    return scipy.signal.filtfilt(b, a, data, axis=1)

def apply_global_normalization(data, g_mean, g_std):
    return np.clip((data - g_mean.reshape(-1, 1)) / (g_std.reshape(-1, 1) + 1e-8), -5, 5)

def preprocess_for_tcn(raw, g_mean, g_std):
    raw_s1 = raw.copy().pick_channels([ch for ch in S1_CHANNELS if ch in raw.ch_names], ordered=True)
    if raw_s1.info['sfreq'] != SFREQ_S1: raw_s1.resample(SFREQ_S1)
    data = apply_bandpass(raw_s1.get_data(), SFREQ_S1)
    data = apply_global_normalization(data, g_mean, g_std)
    win_samples = WINDOW_SIZE * SFREQ_S1
    return np.array([data[:, i*win_samples:(i+1)*win_samples] for i in range(data.shape[1] // win_samples)], dtype=np.float32)

def extract_features_full(window_data, sfreq=128.0):
    mean_val, std_val = np.mean(window_data, axis=1), np.std(window_data, axis=1)
    skew_val, kurt_val = scipy.stats.skew(window_data, axis=1), scipy.stats.kurtosis(window_data, axis=1)
    freqs, psd = scipy.signal.welch(window_data, sfreq, nperseg=256, axis=1)
    bands = {'delta': (0.5, 4), 'theta': (4, 8), 'alpha': (8, 12), 'beta': (12, 30)}
    
    # UNBREAKABLE MATH FIX: Replaced trapz/trapezoid with reliable sum * df
    df = freqs[1] - freqs[0]
    powers = np.array([np.sum(psd[:, np.logical_and(freqs >= l, freqs <= h)], axis=1) * df for l, h in bands.values()])
    
    total_power = np.sum(powers, axis=0) + 1e-8
    rel_powers = powers / total_power
    delta_theta = powers[0] / (powers[1] + 1e-8)
    
    d1, d2 = np.diff(window_data, axis=1), np.diff(np.diff(window_data, axis=1), axis=1)
    var0, var_d1, var_d2 = np.var(window_data, axis=1), np.var(d1, axis=1), np.var(d2, axis=1)
    mob = np.sqrt(var_d1 / np.where(var0 == 0, 1e-8, var0))
    comp = np.sqrt(var_d2 / np.where(var_d1 == 0, 1e-8, var_d1)) / np.where(mob == 0, 1e-8, mob)
    
    entropy = np.zeros(20)
    for i in range(20):
        h, _ = np.histogram(window_data[i], bins=10, density=True)
        h = h[h > 0]
        entropy[i] = -np.sum(h * np.log2(h))
        
    corr_mat = np.corrcoef(window_data)
    mean_corr = np.mean(np.abs(corr_mat), axis=1)
    
    analytic = scipy.signal.hilbert(window_data, axis=1)
    Z = analytic / (np.abs(analytic) + 1e-8)
    plv_mat = np.abs(Z @ Z.conj().T) / window_data.shape[1]
    np.fill_diagonal(plv_mat, 0)
    mean_plv = np.sum(plv_mat, axis=1) / (window_data.shape[0] - 1)
    
    per_ch = np.column_stack((mean_val, std_val, skew_val, kurt_val, rel_powers[0], rel_powers[1], rel_powers[2], rel_powers[3], delta_theta, var0, mob, comp, entropy, mean_corr, mean_plv))
    spatial_map = np.zeros((5, 5, 15))
    for (row, col), ch_idx in SPATIAL_MAP.items(): spatial_map[row, col, :] = per_ch[ch_idx]
    return spatial_map

# =================================================================
# 3. LOAD MODELS
# =================================================================
print("Loading Models...")
class CleanLayer:
    @classmethod
    def from_config(cls, config):
        config.pop('quantization_config', None)
        return super().from_config(config)

custom_objs = { 'Dense': type('D', (CleanLayer, tf.keras.layers.Dense), {}), 'Conv2D': type('C', (CleanLayer, tf.keras.layers.Conv2D), {}) }
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
tcn_model = tf.keras.models.load_model(os.path.join(BASE_DIR, 'best_tcn.keras'), compile=False)
gate_model = tf.keras.models.load_model(os.path.join(BASE_DIR, 'Gatekeeper_v2_balanced.h5'), custom_objects=custom_objs, compile=False)
spec_model = tf.keras.models.load_model(os.path.join(BASE_DIR, 'old_77_model.h5'), custom_objects=custom_objs, compile=False)

with open(os.path.join(BASE_DIR, 'scaler_v2.pkl'), 'rb') as f: gate_scaler = pickle.load(f)
with open(os.path.join(BASE_DIR, 'scaler_stage3.pkl'), 'rb') as f: spec_scaler = pickle.load(f)
try:
    with open(os.path.join(BASE_DIR, 'threshold_v2.txt'), 'r') as f: gate_threshold = float(f.read().strip())
except:
    gate_threshold = 0.2410
g_mean = np.load(os.path.join(BASE_DIR, 'global_mean.npy'))
g_std = np.load(os.path.join(BASE_DIR, 'global_std.npy'))

print("✅ All Models Loaded!")

# =================================================================
# 4. API ENDPOINT
# =================================================================
@app.route('/api/analyze', methods=['POST'])
def analyze_eeg():
    if 'file' not in request.files: return jsonify({'error': 'No file uploaded'}), 400
    temp_path = "temp_api.edf"
    request.files['file'].save(temp_path)
    
    try:
        raw = mne.io.read_raw_edf(temp_path, preload=True, verbose=False)
        raw.rename_channels({ch: ch.upper().replace('EEG ', '').replace('-REF', '').replace('-LE', '') for ch in raw.ch_names})
        
        windows = preprocess_for_tcn(raw, g_mean, g_std)
        if windows is None or len(windows) == 0:
            raise Exception("Could not extract enough data from EDF.")
            
        probs_1 = tcn_model.predict(windows, verbose=0).flatten()
        max_prob = float(np.max(probs_1))
        is_abnormal = max_prob >= 0.5
        confidence = max_prob * 100 if is_abnormal else (1 - max_prob) * 100
        
        if not is_abnormal:
            os.remove(temp_path)
            return jsonify({ "status": "NORMAL", "confidence": round(confidence, 1), "totalWindows": len(probs_1) * 6, "seizureWindows": 0, "episodes": [], "summary": {"FNSZ":0, "GNSZ":0, "CPSZ":0} })

        picked = [ch for ch in S2_S3_CHANNELS if ch in raw.ch_names]
        raw_s2 = raw.copy().pick_channels(picked, ordered=True)
        if raw_s2.info['sfreq'] != TARGET_SFREQ_S2: raw_s2.resample(TARGET_SFREQ_S2)
        raw_s2.filter(1.0, 30.0, verbose=False)
        data_s2 = raw_s2.get_data()
        
        data_full = np.zeros((20, data_s2.shape[1]), dtype=np.float32)
        for out_idx, ch_name in enumerate(S2_S3_CHANNELS):
            if ch_name in picked: data_full[out_idx] = data_s2[picked.index(ch_name)]
        
        X_spatial, window_times = [], []
        for win_start in range(0, data_full.shape[1] - POINTS_PER_WINDOW + 1, POINTS_PER_WINDOW):
            win = data_full[:, win_start:win_start + POINTS_PER_WINDOW]
            win_norm = (win - np.mean(win, axis=1, keepdims=True)) / (np.std(win, axis=1, keepdims=True) + 1e-8)
            X_spatial.append(extract_features_full(win_norm, sfreq=TARGET_SFREQ_S2))
            window_times.append(win_start / TARGET_SFREQ_S2)
        
        X_spatial = np.array(X_spatial, dtype=np.float32)
        X_scaled = gate_scaler.transform(np.nan_to_num(X_spatial.reshape(-1, 15))).reshape(len(X_spatial), 5, 5, 15)
        seizure_mask = gate_model.predict(X_scaled, verbose=0).flatten() > gate_threshold
        seizure_indices = np.where(seizure_mask)[0]
        
        if len(seizure_indices) == 0:
            os.remove(temp_path)
            return jsonify({ "status": "ABNORMAL", "confidence": round(confidence, 1), "totalWindows": len(X_spatial), "seizureWindows": 0, "episodes": [], "summary": {"FNSZ":0, "GNSZ":0, "CPSZ":0} })
        
        X_spec_scaled = spec_scaler.transform(np.nan_to_num(X_spatial[seizure_indices].reshape(-1, 15))).reshape(-1, 5, 5, 15)
        preds_spec = np.argmax(spec_model.predict(X_spec_scaled, verbose=0), axis=1)
        
        timeline = np.ones(len(X_spatial), dtype=int)
        for idx, p in zip(seizure_indices, preds_spec): timeline[idx] = S3_TO_APP_MAP[p]
        
        summary = { "FNSZ": int(np.sum(timeline == 2)), "GNSZ": int(np.sum(timeline == 3)), "CPSZ": int(np.sum(timeline == 4)) }
        
        episodes = []
        i = 0
        ep_id = 1
        while i < len(timeline):
            val = int(timeline[i])
            j = i + 1
            while j < len(timeline) and int(timeline[j]) == val: j += 1
            
            if val >= 2:
                code = TYPE_CODES[val]
                dur = (int(window_times[j - 1]) + SECONDS_PER_WINDOW) - int(window_times[i])
                episodes.append({
                    "id": ep_id, "code": code, "name": TYPE_LABELS[val],
                    "start": int(window_times[i]), "end": int(window_times[i]) + dur,
                    "duration": f"{dur}s ({dur//60}m {dur%60}s)", "color": TYPE_COLORS[val]
                })
                ep_id += 1
            i = j
            
        os.remove(temp_path)
        
        return jsonify({
            "status": "ABNORMAL",
            "confidence": round(confidence, 1),
            "totalWindows": len(X_spatial), # <--- Outputs 30 (10s windows)
            "seizureWindows": int(seizure_mask.sum()),
            "summary": summary,
            "episodes": episodes
        })

    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)