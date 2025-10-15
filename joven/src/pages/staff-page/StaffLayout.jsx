import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { FiBox, FiHome, FiLogOut, FiCalendar } from 'react-icons/fi';
import jovenlogo from '../../assets/jovenlogo.png';
import '../../styles/staff-styles/StaffLayout.css';

const StaffLayout = ({ children }) => {
  const navigate = useNavigate();
  const [staffName, setStaffName] = useState('');

  useEffect(() => {
    const fetchStaff = async () => {
      const user = auth.currentUser;
      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setStaffName(docSnap.data().name || 'Staff');
          } else {
            setStaffName(user.displayName || 'Staff');
          }
        } catch (error) {
          console.error('Error fetching staff data:', error);
        }
      }
    };
    fetchStaff();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div className="staff-dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-section">
          <img
            src={jovenlogo} 
            alt="Awto Logo"
            className="logo-img"
          />
          <p className="staff-greeting">
            Hello, <span>{staffName}!</span>
          </p>
        </div>

        <nav className="staff-sidebar-nav">
          <NavLink to="/staff-dashboard" className="nav-link">
            <FiHome className="icon" />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/staff-inventory" className="nav-link">
            <FiBox className="icon" />
            <span>Inventory</span>
          </NavLink>
          <NavLink to="/staff-sales" className="nav-link">
            <FiBox className="icon" />
            <span>Sales</span>
          </NavLink>
          <NavLink to="/staff-reservation" className="nav-link">
            <FiCalendar className="icon" />
            <span>Reservation</span>
          </NavLink>
        </nav>

        <button onClick={handleLogout} className="logout-button">
          <FiLogOut className="icon" />
          <span>Logout</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="staff-main-content">
        {children}
      </main>
    </div>
  );
};

export default StaffLayout;
