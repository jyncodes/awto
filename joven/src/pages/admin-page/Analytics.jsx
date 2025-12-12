import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from "firebase/firestore";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "../../styles/admin-styles/Analytics.css";

// Calendar Component
import ReservationCalendar from "../../components/shared-components/ReservationCalendar";

const Analytics = () => {
  const navigate = useNavigate();
  const [salesData, setSalesData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [todaySales, setTodaySales] = useState(0);
  const [weeklySales, setWeeklySales] = useState(0);

  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [selectedChart, setSelectedChart] = useState("all");
  const [selectedReservation, setSelectedReservation] = useState(null);

  const formatCurrency = (amount) =>
    `₱${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  useEffect(() => {
    // ================= SALES LISTENER =================
    const qSales = query(collection(db, "sales"), orderBy("createdAt", "desc"));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSalesData(data);

      const grouped = {};
      data.forEach((s) => {
        if (!s.createdAt?.seconds) return;
        const date = new Date(s.createdAt.seconds * 1000).toLocaleDateString();
        grouped[date] = (grouped[date] || 0) + (s.totalAmount || 0);
      });

      const formatted = Object.entries(grouped)
        .map(([date, total]) => ({ date, total }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      setChartData(formatted);

      const now = new Date();
      const today = now.toDateString();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      let todayTotal = 0;
      let weekTotal = 0;

      data.forEach((sale) => {
        const total = sale.totalAmount || 0;
        const date = sale.createdAt?.seconds
          ? new Date(sale.createdAt.seconds * 1000)
          : null;

        if (!date) return;
        if (date.toDateString() === today) todayTotal += total;
        if (date >= startOfWeek) weekTotal += total;
      });

      setTodaySales(todayTotal);
      setWeeklySales(weekTotal);
    });

    // ================= LOW STOCK =================
    let combined = [];

    const unsubTires = onSnapshot(collection(db, "products_tires"), (snapshot) => {
      const tires = snapshot.docs.map((d) => ({ id: d.id, type: "Tire", ...d.data() }));
      combined = [...tires, ...combined.filter((p) => p.type !== "Tire")];
      updateLowStock(combined);
    });

    const unsubMags = onSnapshot(collection(db, "products_mags"), (snapshot) => {
      const mags = snapshot.docs.map((d) => ({ id: d.id, type: "Mags", ...d.data() }));
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
      const allReservations = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setReservations(allReservations);
    });

    return () => {
      unsubSales();
      unsubTires();
      unsubMags();
      unsubRes();
    };
  }, []);

  // ================= CHART FILTERING =================
  let filteredChartData = chartData;

  if (selectedChart === "today") {
    const today = new Date().toLocaleDateString();
    filteredChartData = chartData.filter((d) => d.date === today);
  }

  if (selectedChart === "week") {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    filteredChartData = chartData.filter((d) => {
      const dDate = new Date(d.date);
      return dDate >= startOfWeek;
    });
  }

  // ================= UPDATE RESERVATION STATUS =================
  const updateStatus = async (status) => {
    await updateDoc(doc(db, "reservations", selectedReservation.id), { status });
    setSelectedReservation((prev) => ({ ...prev, status }));
  };

  return (
    <div className="analytics-container">

      {/* HEADER */}
      <div className="analytics-header">
        <h1>Business Analytics</h1>
        <p>Monitor reservations, inventory health, and performance charts.</p>
      </div>

      {/* ===================================================== */}
      {/* 📆 RESERVATION CALENDAR */}
      {/* ===================================================== */}
      <div className="table-card">
        <h2>📆 Reservation Calendar</h2>

        <ReservationCalendar
          reservations={reservations}
          onSelectReservation={(res) => setSelectedReservation(res)}
        />

        {/* MODAL */}
        {selectedReservation && (
          <div className="reservation-modal-overlay" onClick={() => setSelectedReservation(null)}>
            <div className="reservation-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Reservation Details</h2>

              <p><strong>ID:</strong> {selectedReservation.id}</p>
              <p><strong>Customer:</strong> {selectedReservation.userName}</p>
              <p><strong>Status:</strong> {selectedReservation.status}</p>
              <p>
                <strong>Date:</strong>{" "}
                {selectedReservation.preferredDate?.seconds
                  ? new Date(selectedReservation.preferredDate.seconds * 1000).toLocaleDateString()
                  : "—"}
              </p>

              {selectedReservation.selectedServices?.length > 0 && (
                <>
                  <p><strong>Services:</strong></p>
                  <ul>
                    {selectedReservation.selectedServices.map((s, index) => (
                      <li key={index}>{s.name} – ₱{s.price}</li>
                    ))}
                  </ul>
                </>
              )}

              {selectedReservation.productName && (
                <p><strong>Product:</strong> {selectedReservation.productName}</p>
              )}

              {/* ================= STATUS BUTTONS ================= */}
              <div className="status-buttons">
                <button className="status-btn approve" onClick={() => updateStatus("Approved")}>
                  Approve
                </button>

                <button className="status-btn complete" onClick={() => updateStatus("Completed")}>
                  Mark Completed
                </button>

                <button className="status-btn noshow" onClick={() => updateStatus("No-Show")}>
                  No-Show
                </button>

                <button className="status-btn cancel" onClick={() => updateStatus("Cancelled")}>
                  Cancel
                </button>

                <button className="status-btn pending" onClick={() => updateStatus("Pending")}>
                  Set to Pending
                </button>
              </div>

              <button className="close-btn" onClick={() => setSelectedReservation(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ===================================================== */}
      {/* LOW STOCK PRODUCTS */}
      {/* ===================================================== */}
      <div className="table-card">
        <h2>⚠️ Low Stock Products</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Type</th>
              <th>Stock</th>
              <th>Restock</th>
            </tr>
          </thead>
          <tbody>
            {lowStockProducts.length ? (
              lowStockProducts.map((item) => (
                <tr key={item.id}>
                  <td>{item.brand} {item.model}</td>
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
              ))
            ) : (
              <tr><td colSpan="4">All stocks are sufficient.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===================================================== */}
      {/* SALES CARDS + CHART */}
      {/* ===================================================== */}
      <div className="summary-cards">
        <div
          className={`summary-card blue ${selectedChart === "today" ? "active" : ""}`}
          onClick={() => setSelectedChart("today")}
        >
          <h3>Today’s Sales</h3>
          <p>{formatCurrency(todaySales)}</p>
        </div>

        <div
          className={`summary-card green ${selectedChart === "week" ? "active" : ""}`}
          onClick={() => setSelectedChart("week")}
        >
          <h3>This Week’s Sales</h3>
          <p>{formatCurrency(weeklySales)}</p>
        </div>
      </div>

      <div className="chart-card">
        <h2>📊 Sales Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={filteredChartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `₱${value.toLocaleString()}`} />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#007bff" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default Analytics;
