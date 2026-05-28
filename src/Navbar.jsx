import { Link, useNavigate } from 'react-router-dom';
import { logoutDoctor, getActiveDoctorSession } from './dataService';
import Logo from './Logo';

export default function Navbar() {
  const navigate = useNavigate();
  const session = getActiveDoctorSession();

  const handleLogout = () => {
    logoutDoctor();
    navigate('/login');
  };

  // Don't show the navbar if nobody is logged in
  if (!session) return null;

  return (
    <nav className="glass-navbar">
      <div className="nav-brand" onClick={() => navigate('/dashboard')}>
        <Logo className="nav-logo" />
          <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#000000', letterSpacing: '-0.5px' }}>Epi<span style={{ color: '#2563eb' }}>Detect</span></h1>
      </div>
      
      <div className="nav-actions">
        <span className="nav-user">
          <span className="user-avatar">{session.name.charAt(0)}</span>
          <span className="user-name">Dr. {session.name.split(' ')[0]}</span>
        </span>
        <Link to="/profile" className="nav-link">Profile</Link>
        <button onClick={handleLogout} className="danger-btn small-btn logout-btn">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
          </svg>
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </nav>
  );
}