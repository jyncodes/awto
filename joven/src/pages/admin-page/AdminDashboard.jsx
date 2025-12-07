import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
import jovenLogo from '../../assets/jovenlogo.png';
import '../../styles/admin-styles/AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      alert('Logout failed. Please try again.');
    }
  };

  const navItems = [
    { path: '', label: 'Analytics' },
    { path: 'sales', label: 'Sales' },
    { path: 'inventory', label: 'Inventory' },
    { path: 'products', label: 'Products' },
    { path: 'customers', label: 'Customers' },
    { path: 'reservations', label: 'Reservations' },
    { path: 'settings', label: 'Settings' },
  ];

  return (
    <div className="admin-dashboard">

      {/* TOPBAR (Replaces Sidebar) */}
      <header className="admin-topbar">
        <div className="admin-topbar-left">
          <img src={jovenLogo} alt="Joven Logo" className="admin-logo-img" />
          <h2 className="admin-logo-text">Joven Tire Admin</h2>
        </div>

        <nav className="admin-topnav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={
                item.path === ''
                  ? '/admin-dashboard'
                  : `/admin-dashboard/${item.path}`
              }
              end={item.path === ''}
              className={({ isActive }) =>
                isActive ? 'admin-topnav-link active' : 'admin-topnav-link'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-topbar-right">
          <button className="admin-logout-button" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminDashboard;
