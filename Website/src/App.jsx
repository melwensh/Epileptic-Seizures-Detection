import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import AddPatient from './AddPatient';
import Profile from './Profile';
import Navbar from './Navbar';
import PatientSummary from './PatientSummary';
// IMPORT NEW FILES
import PatientHistory from './PatientHistory';
import RecordView from './RecordView';

const Layout = ({ children }) => {
  const location = useLocation();
  const hideNavbar = location.pathname === '/login' || location.pathname === '/register' || location.pathname === '/';
  
  return (
    <>
      {!hideNavbar && <Navbar />}
      <div className={!hideNavbar ? "page-content-with-nav" : ""}>
        {children}
      </div>
    </>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/add-patient" element={<AddPatient />} />
          {/* NEW ROUTES */}
          <Route path="/patient/:id" element={<PatientHistory />} />
          <Route path="/record/:recordId" element={<RecordView />} />
          <Route path="/patient/:id/summary" element={<PatientSummary />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}