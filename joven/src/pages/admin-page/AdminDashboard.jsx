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
    // Removed Vehicle Fitment
    { path: 'staffs', label: 'Staffs' },
    { path: 'customers', label: 'Customers' },
    { path: 'reservations', label: 'Reservations' },
    { path: 'settings', label: 'Settings' },
  ];

  return (
    <div className="admin-dashboard">
      {/* Sidebar */}
      <aside className="admin-sidebar" aria-label="Sidebar Navigation">
        <div className="admin-sidebar-header">
          <h2 className="admin-logo">Joven Tire Admin</h2>
        </div>

        <nav className="admin-nav">
          <ul className="admin-nav-list">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={
                    item.path === ''
                      ? '/admin-dashboard'
                      : `/admin-dashboard/${item.path}`
                  }
                  end={item.path === ''}
                  className={({ isActive }) =>
                    isActive ? 'admin-nav-link active' : 'admin-nav-link'
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="admin-logout-container">
          <button
            onClick={handleLogout}
            className="admin-logout-button"
            aria-label="Logout"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main-content">
        <div className="admin-page-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
