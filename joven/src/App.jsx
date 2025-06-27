import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

// Public Pages
import LandingPage from './pages/LandingPage';
import Register from './pages/Register';
import ViewProduct from './components/ViewProduct';
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

// User Pages
import UserDashboard from './pages/user-page/UserDashboard';
import UserProfile from './pages/user-page/UserProfile';
import InvoicePage from './pages/user-page/InvoicePage';
import PaymentPage from './pages/user-page/PaymentPage';
import ReceiptPage from './pages/user-page/ReceiptPage'; // ✅ Added

// Reservation Page
import ReservationPage from './components/ReservationPage';

// Staff Pages
import StaffDashboard from './pages/staff-page/StaffDashboard';
import StaffInventory from './pages/staff-page/StaffInventory';
import StaffSales from './pages/staff-page/StaffSales';
import StaffReservation from './pages/staff-page/StaffReservation';

// Auth Guards
import RedirectIfAuthenticated from './components/RedirectIfAuthenticated';
import RequireVerifiedEmail from './components/RequireVerifiedEmail';

// Spinner UI
const Spinner = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
  </div>
);

// ProtectedRoute
const ProtectedRoute = ({ role, children }) => {
  const [loading, setLoading] = useState(true);
  const [granted, setGranted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        let ref = doc(db, 'users', user.uid);
        let snap = await getDoc(ref);

        if (!snap.exists()) {
          ref = doc(db, 'staff', user.uid);
          snap = await getDoc(ref);
        }

        if (snap.exists()) {
          const { role: userRole } = snap.data();
          if (userRole === role) {
            setGranted(true);
          } else {
            navigate('/');
          }
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('Authorization error:', err);
        navigate('/');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [role, navigate]);

  if (loading) return <Spinner />;
  return granted ? children : null;
};

const WithOrigin = ({ children }) => {
  const location = useLocation();
  return React.cloneElement(children, { origin: location.pathname });
};

export default function App() {
  return (
    <Router>
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

        <Route
          path="/reserve/:productId"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute role="User">
                <ReservationPage />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />

        {/* ✅ Invoice Route */}
        <Route
          path="/invoice/:reservationId"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute role="User">
                <InvoicePage />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />

        {/* ✅ Payment Route */}
        <Route
          path="/payment/:reservationId"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute role="User">
                <PaymentPage />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />

        {/* ✅ Receipt Route */}
        <Route
          path="/receipt/:reservationId"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute role="User">
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
              <ProtectedRoute role="User">
                <UserProfile />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />
        <Route
          path="/user-dashboard"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute role="User">
                <UserDashboard />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin-dashboard"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute role="Admin">
                <AdminDashboard />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        >
          <Route index element={<AdminDashboardContent />} />
          <Route path="sales" element={<AdminSales />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="products" element={<AdminProducts />} />
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
              <ProtectedRoute role="Staff">
                <StaffDashboard />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />
        <Route
          path="/staff-inventory"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute role="Staff">
                <StaffInventory />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />
        <Route
          path="/staff-sales"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute role="Staff">
                <StaffSales />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />
        <Route
          path="/staff-reservation"
          element={
            <RequireVerifiedEmail>
              <ProtectedRoute role="Staff">
                <StaffReservation />
              </ProtectedRoute>
            </RequireVerifiedEmail>
          }
        />

        {/* Fallback 404 */}
        <Route path="*" element={<div className="text-center p-10">404 - Page Not Found</div>} />
      </Routes>
    </Router>
  );
}
