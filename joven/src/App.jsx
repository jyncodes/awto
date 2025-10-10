import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';

// Public Pages
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import ViewProduct from './pages/user-page/ViewProduct';
import Verify from './pages/Verify';

// Admin Pages
import AdminDashboard from './pages/admin-page/AdminDashboard';
import AdminSales from './pages/admin-page/Sales';
import AdminInventory from './pages/admin-page/Inventory';
import AdminProducts from './pages/admin-page/Products';
import AdminStaffs from './pages/admin-page/Staffs';
import AdminReservations from './pages/admin-page/Reservations';
import AdminCustomers from './pages/admin-page/Customers';
import AdminSettings from './pages/admin-page/Settings';
import AdminDashboardContent from './pages/admin-page/AdminDashboardContent';
import Vehicles from './pages/admin-page/Vehicles';

// User Pages
import UserDashboard from './pages/user-page/UserDashboard';
import UserProfile from './pages/user-page/UserProfile';
import InvoicePage from './pages/user-page/InvoicePage';
import PaymentPage from './pages/user-page/PaymentPage';
import ReceiptPage from './pages/user-page/ReceiptPage';
import DevTools from './pages/user-page/DevTools'; // ✅ Added DevTools

// Reservation Page
import ReservationPage from './pages/user-page/ReservationPage';

// Staff Pages
import StaffDashboard from './pages/staff-page/StaffDashboard';
import StaffInventory from './pages/staff-page/StaffInventory';
import StaffSales from './pages/staff-page/StaffSales';
import StaffReservation from './pages/staff-page/StaffReservation';

// Auth Guards
import ProtectedRoute from './routes/ProtectedRoute';
import RedirectIfAuthenticated from './routes/RedirectIfAuthenticated';
import RequireVerifiedEmail from './routes/RequireVerifiedEmail';

// Utility wrapper to pass origin
const WithOrigin = ({ children }) => {
  const location = useLocation();
  return React.cloneElement(children, { origin: location.pathname });
};

// ✅ Shortcut key hook
const GlobalKeyboardShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === 'D' && e.shiftKey) || e.key === 'd') {
        e.preventDefault();
        navigate('/devtools');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return null;
};

export default function App() {
  return (
    <Router>
      <GlobalKeyboardShortcuts /> {/* ✅ Global listener for shortcut key */}
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <WithOrigin>
              <RedirectIfAuthenticated>
                <LandingPage />
              </RedirectIfAuthenticated>
            </WithOrigin>
          }
        />
        <Route
          path="/register"
          element={
            <WithOrigin>
              <RedirectIfAuthenticated>
                <Register />
              </RedirectIfAuthenticated>
            </WithOrigin>
          }
        />
        <Route path="/verify" element={<Verify />} />
        <Route path="/view-product/:id" element={<ViewProduct />} />

        {/* ✅ DevTools Route */}
        <Route path="/devtools" element={<DevTools />} />

        {/* Reservation + Transactions */}
        <Route
          path="/reserve/:productId"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute allowedRole="User">
                <ReservationPage />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />
        <Route
          path="/invoice/:reservationId"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute allowedRole="User">
                <InvoicePage />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />
        <Route
          path="/payment/:reservationId"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute allowedRole="User">
                <PaymentPage />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />
        <Route
          path="/receipt/:reservationId"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute allowedRole="User">
                <ReceiptPage />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />

        {/* User Routes */}
        <Route
          path="/profile"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute allowedRole="User">
                <UserProfile />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />
        <Route
          path="/user-dashboard"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute allowedRole="User">
                <UserDashboard />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin-dashboard/*"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute allowedRole="Admin">
                <AdminDashboard />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        >
          <Route index element={<AdminDashboardContent />} />
          <Route path="sales" element={<AdminSales />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="vehicle-fitment" element={<Vehicles />} />
          <Route path="staffs" element={<AdminStaffs />} />
          <Route path="reservations" element={<AdminReservations />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Staff Routes */}
        <Route
          path="/staff-dashboard"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute allowedRole="Staff">
                <StaffDashboard />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />
        <Route
          path="/staff-inventory"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute allowedRole="Staff">
                <StaffInventory />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />
        <Route
          path="/staff-sales"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute allowedRole="Staff">
                <StaffSales />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />
        <Route
          path="/staff-reservation"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute allowedRole="Staff">
                <StaffReservation />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />

        {/* Fallback 404 */}
        <Route
          path="*"
          element={<div className="text-center p-10">404 - Page Not Found</div>}
        />
      </Routes>
    </Router>
  );
}
