// 📁 src/pages/admin-page/Analytics.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, onSnapshot, query, orderBy, getDoc, doc } from "firebase/firestore";
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

    // ================= LOW STOCK PRODUCTS (UPDATED) =================
    let combined = [];

    const unsubTires = onSnapshot(collection(db, "products_tires"), (snapshot) => {
      const tires = snapshot.docs.map((docItem) => {
        const data = docItem.data();
        return {
          id: docItem.id,
          type: "Tire",
          ...data,
        };
      });

      combined = [...tires, ...combined.filter((p) => p.type !== "Tire")];
      updateLowStock(combined);
    });

    const unsubMags = onSnapshot(collection(db, "products_mags"), (snapshot) => {
      const mags = snapshot.docs.map((docItem) => {
        const data = docItem.data();
        return {
          id: docItem.id,
          type: "Mags",
          ...data,
        };
      });

      combined = [...combined.filter((p) => p.type !== "Mags"), ...mags];
      updateLowStock(combined);
    });

    const updateLowStock = (list) => {
      const low = list.filter((p) => Number(p.stock) <= 5).slice(0, 5);
      setLowStockProducts(low);
    };

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
      unsubTires();
      unsubMags();
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

      {/* LOW STOCK */}
      <div className="table-card">
        <h2>⚠️ Low Stock Products</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Type</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {lowStockProducts.length > 0 ? (
              lowStockProducts.map((item) => {
                const productName =
                  item.type === "Tire"
                    ? `${item.brand} ${item.model} ${item.tireWidth}/${item.aspectRatio}R${item.rimDiameter}`
                    : `${item.brand} ${item.model} ${item.wheelDiameter}x${item.wheelWidth}`;

                return (
                  <tr key={item.id}>
                    <td>{productName}</td>
                    <td>{item.type}</td>
                    <td>{item.stock}</td>
                    <td>
                      <button
                        className="restock-btn"
                        onClick={() => navigate("/admin-dashboard/inventory")}
                      >
                        Restock
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="4">All stocks are sufficient.</td>
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
        <th>Reservation ID</th>
        <th>Product</th>
        <th>View</th>
      </tr>
    </thead>
    <tbody>
      {upcomingReservations.length > 0 ? (
        upcomingReservations.map((res) => (
          <tr key={res.id}>
            <td>{res.id}</td>
            <td>{res.productName || "N/A"}</td>
            <td>
              <button
                className="view-btn"
                onClick={() => navigate("/admin-dashboard/reservations")}
              >
                👁 View
              </button>
            </td>
          </tr>
        ))
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
