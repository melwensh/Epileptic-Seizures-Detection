# EpiDetect 🧠
An Automated System for Epileptic Seizure Detection & Neurological Analysis

## 📌 Project Overview
EpiDetect is a full-stack medical web platform designed to assist neurologists in analyzing EEG (Electroencephalogram) signals. The system allows doctors to upload patient EDF files, processes the raw brainwaves using a multi-stage Deep Learning pipeline, and presents the results through an interactive, clinical-grade React dashboard.


## 🚀 Key Features I Developed

### 1. The AI Pipeline & Signal Processing (`app.py`)
I implemented a robust Flask API that handles raw `.edf` files using `mne-python` and passes them through a 3-stage deep learning architecture:
* **Stage 1 (TCN Anomaly Detection):** A Temporal Convolutional Network that quickly scans 100Hz signals to filter out completely normal records, saving computational power.
* **Stage 2 (Dual-Input Gatekeeper):** A seizure detection model that takes both **Raw EEG windows** and **15 Engineered Features** (extracted using SciPy, including PSD, Hilbert Transform, Delta/Theta ratios, Skew, and Kurtosis) to precisely locate seizure windows.
* **Stage 3 (Dual-Input Transformer):** Classifies the detected seizure windows into specific typologies (FNSZ: Focal Non-motor, GNSZ: Generalized, CPSZ: Complex Partial) using spatial-temporal frequency maps.
* **Robust Data Scaling:** Replaced traditional scalers with Median & IQR robust scaling to handle EEG artifacts effectively.

### 2. The Clinical Frontend Dashboard (`React.js`)
I built a responsive, medical-grade user interface using React to translate raw AI predictions into actionable clinical data:
* **Dynamic Clinical States:** Engineered the frontend logic to accurately differentiate between **NORMAL**, **ICTAL** (active clinical seizures), and **INTERICTAL** (epileptiform discharges without active seizures) based on the AI's window counts.
* **Interactive EEG Trace Viewer:** Designed a custom UI component that visualizes the EEG scan duration and highlights seizure episodes with specific color codes and precise start/end timestamps.
* **Seizure Burden Analytics:** Aggregated raw AI outputs into clear medical metrics (e.g., Total Monitored Time, Seizure Burden Percentage, and Typology Breakdown).
* **Automated PDF Reporting:** Created a print-optimized React component that generates an official, A4-sized clinical summary report, complete with a physician's signature line and demographic data.
* **Data Management:** Implemented a secure, globally unique ID allocation system to manage patient records and prevent cross-patient data collisions in local storage.

---

## 📊 Dataset Used
The deep learning models were trained and evaluated using the **[TUH EEG Seizure /TUH EEG Abnormal / Bonn]**, ensuring the models are robust across diverse clinical scenarios and demographic variances.

---

## 🛠️ Tech Stack Used
* **Frontend:** React.js, React Router, CSS3 (Responsive Grid/Flexbox Architectures).
* **AI Backend:** Python, Flask, MNE-Python, SciPy, NumPy.
* **Machine Learning:** TensorFlow / Keras (TCN, Transformers, Multi-Head Attention).

---

## ⚙️ How to Run the Project

### 1. Start the AI Backend
```bash
cd Website/src
pip install -r requirements.txt
python app.py
```
### 2. Start the FrontEnd
```bash
cd Website/src
npm install
npm run dev 
```
