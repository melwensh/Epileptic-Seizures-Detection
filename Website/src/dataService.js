// --- DOCTOR AUTH & PROFILE ---
export const registerDoctor = (name, email, password, phone, hospital) => {
  const doctors = JSON.parse(localStorage.getItem('eeg_doctors')) || [];
  
  if (doctors.some(doc => doc.email === email)) {
    return { success: false, message: "This email is already registered." };
  }
  
  doctors.push({ name, email, password, phone, hospital }); 
  localStorage.setItem('eeg_doctors', JSON.stringify(doctors));
  return { success: true };
};

export const loginDoctor = (email, password) => {
  const doctors = JSON.parse(localStorage.getItem('eeg_doctors')) || [];
  const doctor = doctors.find(doc => doc.email === email && doc.password === password);
  
  if (doctor) {
    localStorage.setItem('active_doctor', JSON.stringify({ name: doctor.name, email: doctor.email }));
    return { success: true, doctor };
  }
  
  return { success: false, message: "Invalid email or password." };
};

export const logoutDoctor = () => localStorage.removeItem('active_doctor');

export const getActiveDoctorSession = () => JSON.parse(localStorage.getItem('active_doctor'));

export const getDoctorProfile = (email) => {
  const doctors = JSON.parse(localStorage.getItem('eeg_doctors')) || [];
  return doctors.find(doc => doc.email === email);
};

export const updateDoctorProfile = (originalEmail, updatedData) => {
  let doctors = JSON.parse(localStorage.getItem('eeg_doctors')) || [];
  const index = doctors.findIndex(doc => doc.email === originalEmail);
  
  if (index !== -1) {
    if (originalEmail !== updatedData.email && doctors.some(d => d.email === updatedData.email)) {
      return { success: false, message: "Email in use." };
    }
    doctors[index] = { ...doctors[index], ...updatedData };
    localStorage.setItem('eeg_doctors', JSON.stringify(doctors));
    localStorage.setItem('active_doctor', JSON.stringify({ name: updatedData.name, email: updatedData.email }));
    return { success: true };
  }
  return { success: false, message: "Account not found." };
};

// --- HELPER FUNCTIONS (Internal use only) ---
// Gets absolutely all patients from the storage
const getAllPatientsRaw = () => JSON.parse(localStorage.getItem('eeg_patients')) || [];
// Gets absolutely all records from the storage
const getAllRecordsRaw = () => JSON.parse(localStorage.getItem('eeg_records')) || [];


// --- PATIENT MANAGEMENT ---

export const getPatients = () => {
  const allPatients = getAllPatientsRaw();
  const activeDoctor = getActiveDoctorSession();
  
  if (!activeDoctor) return [];
  
  return allPatients.filter(p => p.doctorEmail === activeDoctor.email);
};

export const getPatientById = (id) => getPatients().find(p => p.id === id);

// MODIFIED: Gap-filling allocation for Patients
export const addPatient = (patient) => {
  const allPatients = getAllPatientsRaw();
  const activeDoctor = getActiveDoctorSession();
  
  if (activeDoctor) {
    patient.doctorEmail = activeDoctor.email; 
  }

  // Get only this doctor's patients
  const doctorPatients = activeDoctor 
    ? allPatients.filter(p => p.doctorEmail === activeDoctor.email)
    : allPatients;

  // 1. Extract all existing IDs, convert to numbers, remove duplicates, and sort ascending
  const usedIds = [...new Set(doctorPatients.map(p => {
    const num = parseInt(String(p.id).replace(/[^0-9]/g, ''), 10);
    return isNaN(num) ? 0 : num;
  }))].sort((a, b) => a - b);

  // 2. Find the lowest available gap
  let nextIdNumber = 1;
  for (let i = 0; i < usedIds.length; i++) {
    if (usedIds[i] === nextIdNumber) {
      nextIdNumber++; // Number is taken, check the next one
    } else if (usedIds[i] > nextIdNumber) {
      break; // We found a gap!
    }
  }
  
  // Assign the gap-filled ID
  if (!patient.id) {
    patient.id = nextIdNumber.toString(); 
  }
  
  allPatients.push(patient);
  localStorage.setItem('eeg_patients', JSON.stringify(allPatients));
};

// MODIFIED: Simple delete. No more re-sequencing other patients.
export const deletePatient = (id) => {
  let allPatients = getAllPatientsRaw();
  let allRecords = getAllRecordsRaw();

  // Remove only the target patient and their associated records completely
  allPatients = allPatients.filter(p => p.id !== id);
  allRecords = allRecords.filter(r => r.patientId !== id);

  localStorage.setItem('eeg_patients', JSON.stringify(allPatients));
  localStorage.setItem('eeg_records', JSON.stringify(allRecords));
};


// --- RECORD MANAGEMENT ---

export const getRecords = () => {
  const allRecords = getAllRecordsRaw();
  const activeDoctor = getActiveDoctorSession();
  
  if (!activeDoctor) return [];
  
  return allRecords.filter(r => r.doctorEmail === activeDoctor.email);
};

export const getRecordsByPatient = (patientId) => getRecords().filter(r => r.patientId === patientId);

export const getRecordById = (id) => getRecords().find(r => r.id === id);

// MODIFIED: Gap-filling allocation with Composite ID (P{patientId}-REC-{sequence})
export const addRecord = (record) => {
  const allRecords = getAllRecordsRaw();
  const activeDoctor = getActiveDoctorSession();
  
  if (activeDoctor) {
    record.doctorEmail = activeDoctor.email;
  }
  
  const patientRecords = allRecords.filter(r => r.patientId === record.patientId);
    
  const usedIds = [...new Set(patientRecords.map(r => {
    const parts = String(r.id).split('-REC-');
    const num = parseInt(parts[1], 10);
    return isNaN(num) ? 0 : num;
  }))].sort((a, b) => a - b);

  let nextIdNumber = 1; 
  for (let i = 0; i < usedIds.length; i++) {
    if (usedIds[i] === nextIdNumber) {
      nextIdNumber++; 
    } else if (usedIds[i] > nextIdNumber) {
      break; 
    }
  }

  const formattedId = `P${record.patientId}-REC-${String(nextIdNumber).padStart(2, '0')}`;

  allRecords.push({ ...record, id: formattedId });
  localStorage.setItem('eeg_records', JSON.stringify(allRecords));
};

// MODIFIED: Simple delete. No more re-sequencing other records.
export const deleteRecord = (id) => {
  const allRecords = getAllRecordsRaw();
  
  // Remove only the target record
  const updatedRecords = allRecords.filter(r => r.id !== id);
  
  localStorage.setItem('eeg_records', JSON.stringify(updatedRecords));
};