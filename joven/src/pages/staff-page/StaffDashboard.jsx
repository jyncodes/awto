import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  doc,
  getDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
  getCountFromServer,
} from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import StaffLayout from "./StaffLayout";
import "../../styles/staff-styles/StaffDashboard.css";

const StaffDashboard = () => {
  const [staffData, setStaffData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [todaySales, setTodaySales] = useState(0);
  const [weeklySales, setWeeklySales] = useState(0);
  const [upcomingReservations, setUpcomingReservations] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [counts, setCounts] = useState({ sales: 0, reservations: 0, inventory: 0 });

  const navigate = useNavigate();

  const formatCurrency = (amount) =>
    `₱${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  useEffect(() => {
    const fetchData = async () => {
      const user = auth.currentUser;
      if (!user) return navigate("/login");

      // 🔹 Fetch Staff Info
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return navigate("/login");
      setStaffData(docSnap.data());

      // 🔹 Count values for quick cards
      const salesCount = await getCountFromServer(collection(db, "sales"));
      const reservationCount = await getCountFromServer(collection(db, "reservations"));
      const inventoryCount = await getCountFromServer(collection(db, "products_tires"));

      setCounts({
        sales: salesCount.data().count,
        reservations: reservationCount.data().count,
        inventory: inventoryCount.data().count,
      });

      // ==================== SALES OVERVIEW ====================
      const qSales = query(collection(db, "sales"), orderBy("createdAt", "desc"));
      onSnapshot(qSales, (snapshot) => {
        const data = snapshot.docs.map((d) => d.data());
        
        let todayTotal = 0;
        let weekTotal = 0;
        const now = new Date();
        const today = now.toDateString();

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        data.forEach((sale) => {
          const amount = sale.totalAmount || 0;
          const date = sale.createdAt?.seconds
            ? new Date(sale.createdAt.seconds * 1000)
            : null;

          if (!date) return;
          if (date.toDateString() === today) todayTotal += amount;
          if (date >= startOfWeek) weekTotal += amount;
        });

        setTodaySales(todayTotal);
        setWeeklySales(weekTotal);
      });

      // ==================== UPCOMING RESERVATIONS ====================
      const qRes = query(collection(db, "reservations"), orderBy("preferredDate", "asc"));
      onSnapshot(qRes, (snapshot) => {
        const now = new Date();
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

        const upcoming = list
          .filter((r) => {
            const date = r.preferredDate?.seconds
              ? new Date(r.preferredDate.seconds * 1000)
              : null;
            return date && date >= now;
          })
          .slice(0, 5);

        setUpcomingReservations(upcoming);
      });

      // ==================== LOW STOCK ====================
      let products = [];

      onSnapshot(collection(db, "products_tires"), (snapshot) => {
        const tires = snapshot.docs.map((d) => ({ id: d.id, type: "Tire", ...d.data() }));
        products = [...products.filter((p) => p.type !== "Tire"), ...tires];
        updateLowStock(products);
      });

      onSnapshot(collection(db, "products_mags"), (snapshot) => {
        const mags = snapshot.docs.map((d) => ({ id: d.id, type: "Mags", ...d.data() }));
        products = [...products.filter((p) => p.type !== "Mags"), ...mags];
        updateLowStock(products);
      });

      const updateLowStock = (list) => {
        const low = list.filter((p) => Number(p.stock) <= 5).slice(0, 5);
        setLowStockProducts(low);
      };

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-spin h-10 w-10 rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <StaffLayout>
      <div className="staff-dashboard">

        <h1 className="dashboard-title">Welcome, {staffData?.name || "Staff"} 👋</h1>
        <p className="dashboard-subtext">Here’s a snapshot of service activity.</p>

        {/* ---- SUMMARY CARDS ---- */}
        <div className="summary-cards">
          <div className="summary-card blue">
            <h3>Today’s Sales</h3>
            <p>{formatCurrency(todaySales)}</p>
          </div>
          <div className="summary-card green">
            <h3>This Week’s Sales</h3>
            <p>{formatCurrency(weeklySales)}</p>
          </div>
        </div>

        {/* ---- UPCOMING RESERVATIONS ---- */}
        <div className="table-card">
          <h2>📅 Upcoming Reservations</h2>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Product</th>
                <th>View</th>
              </tr>
            </thead>
            <tbody>
              {upcomingReservations.length ? (
                upcomingReservations.map((r) => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.productName || "N/A"}</td>
                    <td>
                      <button className="view-btn" onClick={() => navigate("/staff-reservation")}>
                        👁 Open
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="3">No upcoming reservations.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ---- LOW STOCK PRODUCTS ---- */}
        <div className="table-card">
          <h2>⚠️ Low Stock Items</h2>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Type</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {lowStockProducts.length ? (
                lowStockProducts.map((item) => (
                  <tr key={item.id}>
                    <td>{item.brand} {item.model}</td>
                    <td>{item.type}</td>
                    <td>{item.stock}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="3">Stock levels are stable.</td></tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </StaffLayout>
  );
};

export default StaffDashboard;
