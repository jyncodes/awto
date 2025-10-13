import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase';
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
    { path: '', label: 'Dashboard' },
    { path: 'sales', label: 'Sales' },
    { path: 'inventory', label: 'Inventory' },
    { path: 'products', label: 'Products' },
    { path: 'suppliers', label: 'Suppliers' },
    { path: 'staffs', label: 'Staffs' },
    { path: 'customers', label: 'Customers' },
    { path: 'reservations', label: 'Reservations' },
    { path: 'settings', label: 'Settings' },
  ];

  return (
    <div className="admin-dashboard">
      {/* Top Navigation */}
      <header className="admin-navbar">
        <div className="admin-logo-text">
          <h1>Joven Tire Admin</h1>
          <span>Control Panel</span>
        </div>

        <nav className="admin-nav-links">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path === '' ? '/admin-dashboard' : `/admin-dashboard/${item.path}`}
              end={item.path === ''}
              className={({ isActive }) =>
                isActive ? 'admin-nav-item active' : 'admin-nav-item'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </header>

      {/* Content */}
      <main className="admin-main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminDashboard;
