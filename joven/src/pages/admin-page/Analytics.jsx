// 📁 src/pages/admin-page/Analytics.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import "../../styles/admin-styles/Analytics.css";

const Analytics = () => {
  const navigate = useNavigate();
  const [salesData, setSalesData] = useState([]);
  const [todaySales, setTodaySales] = useState(0);
  const [weeklySales, setWeeklySales] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [upcomingReservations, setUpcomingReservations] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [topStaff, setTopStaff] = useState([]);

  const formatCurrency = (amount) =>
    `₱${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  useEffect(() => {
    // ================= SALES =================
    const qSales = query(collection(db, "sales"), orderBy("createdAt", "desc"));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSalesData(data);
      setRecentSales(data.slice(0, 5));

      // Calculate totals
      const now = new Date();
      const today = now.toDateString();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      let todayTotal = 0;
      let weekTotal = 0;
      const staffSales = {};

      data.forEach((sale) => {
        const total = sale.totalAmount || 0;
        const date = sale.createdAt?.seconds
          ? new Date(sale.createdAt.seconds * 1000)
          : null;

        if (date) {
          if (date.toDateString() === today) todayTotal += total;
          if (date >= startOfWeek) weekTotal += total;
        }

        // Track top staff
        if (sale.createdByName) {
          const name = sale.createdByName;
          staffSales[name] = (staffSales[name] || 0) + total;
        }
      });

      setTodaySales(todayTotal);
      setWeeklySales(weekTotal);

      const sortedStaff = Object.entries(staffSales)
        .map(([name, total]) => ({ name, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      setTopStaff(sortedStaff);
    });

    // ================= PRODUCTS =================
    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const lowStock = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.stock <= 5) lowStock.push({ id: doc.id, ...data });
      });
      setLowStockProducts(lowStock.slice(0, 5));
    });

    // ================= RESERVATIONS =================
    const qRes = query(collection(db, "reservations"), orderBy("preferredDate", "asc"));
    const unsubRes = onSnapshot(qRes, (snapshot) => {
      const now = new Date();
      const reservations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      const upcoming = reservations
        .filter((r) => {
          const date = r.preferredDate?.seconds
            ? new Date(r.preferredDate.seconds * 1000)
            : r.preferredDate
            ? new Date(r.preferredDate)
            : null;
          return date && date >= now;
        })
        .slice(0, 5);
      setUpcomingReservations(upcoming);
    });

    return () => {
      unsubSales();
      unsubProducts();
      unsubRes();
    };
  }, []);

  const handleRowClick = () => navigate("/admin-dashboard/reservations");

  return (
    <div className="analytics-container">
      {/* HEADER */}
      <div className="analytics-header">
        <h1>Business Analytics</h1>
        <p>Monitor daily performance, inventory status, and reservations.</p>
        <button className="add-sale-btn" onClick={() => navigate("/pos")}>
          ➕ Add Sale
        </button>
      </div>

      {/* SALES OVERVIEW */}
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

      {/* TOP STAFF */}
      <div className="table-card">
        <h2>🏆 Top Performing Staff</h2>
        <table>
          <thead>
            <tr>
              <th>Staff Name</th>
              <th>Total Sales</th>
            </tr>
          </thead>
          <tbody>
            {topStaff.length > 0 ? (
              topStaff.map((s, i) => (
                <tr key={i}>
                  <td>{s.name}</td>
                  <td>{formatCurrency(s.total)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2">No staff sales recorded yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* LOW STOCK */}
      <div className="table-card">
        <h2>⚠️ Low Stock Products</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.stock}</td>
                  <td>
                    <button
                      className="restock-btn"
                      onClick={() => navigate("/admin-dashboard/inventory")}
                    >
                      Restock
                    </button>
                    <button
                      className="contact-supplier-btn"
                      onClick={() => navigate("/admin-dashboard/suppliers")}
                    >
                      Contact Supplier
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3">All stocks are sufficient.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* UPCOMING RESERVATIONS */}
      <div className="table-card">
        <h2>📅 Upcoming Reservations</h2>
        <table>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Service</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {upcomingReservations.length > 0 ? (
              upcomingReservations.map((res) => {
                const date = res.preferredDate?.seconds
                  ? new Date(res.preferredDate.seconds * 1000)
                  : new Date(res.preferredDate);
                return (
                  <tr
                    key={res.id}
                    onClick={handleRowClick}
                    className="clickable-row"
                  >
                    <td>{res.userName || res.customerName || "N/A"}</td>
                    <td>{res.serviceType || "N/A"}</td>
                    <td>{date.toLocaleDateString()}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="3">No upcoming reservations.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Analytics;
