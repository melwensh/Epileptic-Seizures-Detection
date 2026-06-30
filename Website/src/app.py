import os
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
SECONDS_PER_WINDOW = 10
TARGET_SFREQ_S2 = 128.0
POINTS_PER_WINDOW = int(SECONDS_PER_WINDOW * TARGET_SFREQ_S2)

TYPE_LABELS = { 1: "NON-Seizure", 2: "Focal Non-motor Seizure", 3: "Generalized Seizure", 4: "Complex Partial Seizure" }
TYPE_CODES  = { 1: "NON", 2: "FNSZ", 3: "GNSZ", 4: "CPSZ" }
TYPE_COLORS = { 1: "#3b82f6", 2: "#f97316", 3: "#ef4444", 4: "#8b5cf6" }

# Stage 3 new model predicts: 0: FNSZ, 1: GNSZ, 2: CPSZ
# Mapping to Frontend app codes (2: FNSZ, 3: GNSZ, 4: CPSZ)
S3_TO_APP_MAP = { 0: 2, 1: 3, 2: 4 }

# =================================================================
# 2. HELPER FUNCTIONS
# =================================================================
# --- STAGE 1 FUNCTIONS ---
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

# --- STAGE 2 FUNCTIONS ---
def extract_advanced_features_batch_s2(batch_data, sfreq=128.0):
    B, C, T_pts = batch_data.shape
    num_features = 15

    mean_val = np.mean(batch_data, axis=-1)
    std_val  = np.std(batch_data, axis=-1)
    skew_val = scipy.stats.skew(batch_data, axis=-1)
    kurt_val = scipy.stats.kurtosis(batch_data, axis=-1)

    freqs, psd = scipy.signal.welch(batch_data, sfreq, nperseg=256, axis=-1)
    bands = {'delta': (0.5, 4), 'theta': (4, 8), 'alpha': (8, 12), 'beta': (12, 30)}
    powers = []
    for low, high in bands.values():
        idx_band = np.logical_and(freqs >= low, freqs <= high)
        powers.append(np.trapz(psd[:, :, idx_band], freqs[idx_band], axis=-1))

    powers = np.array(powers)
    total_power = np.sum(powers, axis=0) + 1e-8
    rel_powers = powers / total_power
    delta_theta_ratio = powers[0] / (powers[1] + 1e-8)

    d1 = np.diff(batch_data, axis=-1)
    d2 = np.diff(d1, axis=-1)
    var_zero = np.var(batch_data, axis=-1)
    var_d1   = np.var(d1, axis=-1)
    var_d2   = np.var(d2, axis=-1)

    act = var_zero
    mob = np.sqrt(var_d1 / np.where(var_zero == 0, 1e-8, var_zero))
    comp = np.sqrt(var_d2 / np.where(var_d1 == 0, 1e-8, var_d1)) / np.where(mob == 0, 1e-8, mob)

    psd_norm = psd / (np.sum(psd, axis=-1, keepdims=True) + 1e-8)
    entropy = -np.sum(psd_norm * np.log2(psd_norm + 1e-8), axis=-1)

    mean_corr = np.zeros((B, C))
    analytic_signal = scipy.signal.hilbert(batch_data, axis=-1)
    Z = analytic_signal / (np.abs(analytic_signal) + 1e-8)

    for b in range(B):
        corr_matrix = np.corrcoef(batch_data[b])
        mean_corr[b] = np.mean(np.abs(corr_matrix), axis=1)

    plv_matrix = np.abs(Z @ np.swapaxes(Z.conj(), 1, 2)) / T_pts
    mean_plv = (np.sum(plv_matrix, axis=-1) - 1.0) / (C - 1)

    features_per_channel = np.stack((
        mean_val, std_val, skew_val, kurt_val,
        rel_powers[0], rel_powers[1], rel_powers[2], rel_powers[3],
        delta_theta_ratio, act, mob, comp, entropy, mean_corr, mean_plv
    ), axis=-1)

    spatial_map = np.zeros((B, 5, 5, num_features))
    for (row, col), ch_idx in SPATIAL_MAP.items():
        spatial_map[:, row, col, :] = features_per_channel[:, ch_idx, :]

    return spatial_map

def extract_advanced_features_vectorized_s2(data_arr, batch_size=32):
    total = data_arr.shape[0]
    out = []
    for i in range(0, total, batch_size):
        out.append(extract_advanced_features_batch_s2(data_arr[i:i+batch_size], sfreq=TARGET_SFREQ_S2))
    return np.concatenate(out, axis=0)

# --- STAGE 3 FUNCTIONS ---
def extract_frequency_maps_batch_s3(batch_data, sfreq=128.0):
    B, C, T_pts = batch_data.shape
    num_bands = 5
    freqs, psd = scipy.signal.welch(batch_data, sfreq, nperseg=256, axis=-1)

    bands = {'delta': (0.5, 4), 'theta': (4, 8), 'alpha': (8, 13), 'beta': (13, 30), 'gamma': (30, 40)}
    powers = []
    for low, high in bands.values():
        idx_band = np.logical_and(freqs >= low, freqs <= high)
        powers.append(np.trapz(psd[:, :, idx_band], freqs[idx_band], axis=-1))

    psd_features = np.stack(powers, axis=-1)
    spatial_map = np.zeros((B, 5, 5, num_bands))

    for (row, col), ch_idx in SPATIAL_MAP.items():
        spatial_map[:, row, col, :] = psd_features[:, ch_idx, :]

    mean_val = np.mean(spatial_map, axis=(1,2,3), keepdims=True)
    std_val = np.std(spatial_map, axis=(1,2,3), keepdims=True)
    spatial_map = (spatial_map - mean_val) / (std_val + 1e-8)
    return spatial_map

def extract_frequency_maps_vectorized_s3(data_arr, batch_size=32):
    total = data_arr.shape[0]
    out = []
    for i in range(0, total, batch_size):
        out.append(extract_frequency_maps_batch_s3(data_arr[i:i+batch_size], sfreq=TARGET_SFREQ_S2))
    return np.concatenate(out, axis=0)

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

# Models
tcn_model = tf.keras.models.load_model(os.path.join(BASE_DIR,'models', 'best_tcn.keras'), compile=False)
gate_model = tf.keras.models.load_model(os.path.join(BASE_DIR, 'models','Final_Champion_Gatekeeper_v4.h5'), custom_objects=custom_objs, compile=False)
spec_model = tf.keras.models.load_model(os.path.join(BASE_DIR, 'models', 'Seizure_Type_Classifier_v1_Transformer.h5'), custom_objects=custom_objs, compile=False)


# S1 Stats
g_mean = np.load(os.path.join(BASE_DIR, 'models', 'global_mean.npy'))
g_std = np.load(os.path.join(BASE_DIR, 'models', 'global_std.npy'))
gate_threshold = 0.2445

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
        
        # --- STAGE 1: TCN Anomaly Detection ---
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

        # --- STAGE 2: Gatekeeper (Seizure Detection) ---
        picked = [ch for ch in S2_S3_CHANNELS if ch in raw.ch_names]
        raw_s2 = raw.copy().pick_channels(picked, ordered=True)
        if raw_s2.info['sfreq'] != TARGET_SFREQ_S2: raw_s2.resample(TARGET_SFREQ_S2, verbose=False)
    
        # S2 Preprocessing (Notch + Bandpass)
        raw_s2.notch_filter(60.0, verbose=False)
        raw_s2.filter(0.5, 40.0, verbose=False)
        data_s2 = raw_s2.get_data()
        
        data_full = np.zeros((20, data_s2.shape[1]), dtype=np.float32)
        for out_idx, ch_name in enumerate(S2_S3_CHANNELS):
            if ch_name in picked: data_full[out_idx] = data_s2[picked.index(ch_name)]
    
        # Robust Scaling (Median & IQR)
        median_val = np.median(data_full, axis=1, keepdims=True)
        iqr_val = np.percentile(data_full, 75, axis=1, keepdims=True) - np.percentile(data_full, 25, axis=1, keepdims=True)
        data_full = np.clip((data_full - median_val) / (iqr_val + 1e-8), -5.0, 5.0)

        # Non-overlapping windows to match UI Timeline (10s intervals)
        raw_windows_list = []
        window_times = []
        for win_start in range(0, data_full.shape[1] - POINTS_PER_WINDOW + 1, POINTS_PER_WINDOW):
            raw_windows_list.append(data_full[:, win_start:win_start + POINTS_PER_WINDOW])
            window_times.append(win_start / TARGET_SFREQ_S2)
        
        raw_windows_arr = np.stack(raw_windows_list)
        
        # Prepare Dual Inputs for Stage 2
        X_raw_input_s2 = np.swapaxes(raw_windows_arr, 1, 2).astype(np.float32)
        X_eng_input_s2 = extract_advanced_features_vectorized_s2(raw_windows_arr, batch_size=32).astype(np.float32)
        
        # Predict Stage 2
        probs_s2 = gate_model.predict([X_raw_input_s2, X_eng_input_s2], verbose=0).flatten()
        seizure_mask = probs_s2 > gate_threshold
        seizure_indices = np.where(seizure_mask)[0]
        
        if len(seizure_indices) == 0:
            os.remove(temp_path)
            return jsonify({ "status": "ABNORMAL", "confidence": round(confidence, 1), "totalWindows": len(raw_windows_arr), "seizureWindows": 0, "episodes": [], "summary": {"FNSZ":0, "GNSZ":0, "CPSZ":0} })
        
        # --- STAGE 3: Seizure Classification (Transformer) ---
        s3_wins = raw_windows_arr[seizure_indices]
        
        # Prepare Dual Inputs for Stage 3
        X_raw_s3 = np.swapaxes(s3_wins, 1, 2).astype(np.float32)
        X_eng_s3 = extract_frequency_maps_vectorized_s3(s3_wins, batch_size=32).astype(np.float32)
        
        # Predict Stage 3
        preds_spec = np.argmax(spec_model.predict([X_raw_s3, X_eng_s3], verbose=0), axis=1)
        
        # --- TIMELINE & EPISODES MAPPING ---
        timeline = np.ones(len(raw_windows_arr), dtype=int)
        for idx, p in zip(seizure_indices, preds_spec): 
            timeline[idx] = S3_TO_APP_MAP[p]
    
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
            "totalWindows": len(raw_windows_arr),
            "seizureWindows": int(seizure_mask.sum()),
            "summary": summary,
            "episodes": episodes
        })

    except Exception as e:
        if os.path.exists(temp_path): os.remove(temp_path)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)