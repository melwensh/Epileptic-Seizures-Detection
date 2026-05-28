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

// --- PATIENT MANAGEMENT ---
export const getPatients = () => JSON.parse(localStorage.getItem('eeg_patients')) || [];
export const getPatientById = (id) => getPatients().find(p => p.id === id);

export const addPatient = (patient) => {
  const patients = getPatients();
  patients.push(patient);
  localStorage.setItem('eeg_patients', JSON.stringify(patients));
};

export const deletePatient = (id) => {
  let patients = getPatients();
  localStorage.setItem('eeg_patients', JSON.stringify(patients.filter(p => p.id !== id)));
  
  let records = getRecords();
  localStorage.setItem('eeg_records', JSON.stringify(records.filter(r => r.patientId !== id)));
};

// --- RECORD MANAGEMENT ---
export const getRecords = () => JSON.parse(localStorage.getItem('eeg_records')) || [];
export const getRecordsByPatient = (patientId) => getRecords().filter(r => r.patientId === patientId);
export const getRecordById = (id) => getRecords().find(r => r.id === id);

export const addRecord = (record) => {
  const records = getRecords();
  
  // ---> NEW AUTO-INCREMENT LOGIC <---
  let nextIdNumber = 1; // Default to 1 if no records exist
  
  if (records.length > 0) {
    // Find the highest number currently used in the IDs
    const maxId = Math.max(...records.map(r => {
      // Remove "REC-" from the string and turn it into a real number
      const num = parseInt(String(r.id).replace('REC-', ''), 10);
      return isNaN(num) ? 0 : num;
    }));
    
    nextIdNumber = maxId + 1; // Add 1 to the highest number
  }

  // Save with the new formatted ID (e.g., REC-1, REC-2, etc.)
  records.push({ ...record, id: 'REC-' + nextIdNumber });
  localStorage.setItem('eeg_records', JSON.stringify(records));
};

export const deleteRecord = (id) => {
  let records = getRecords();
  localStorage.setItem('eeg_records', JSON.stringify(records.filter(r => r.id !== id)));
};