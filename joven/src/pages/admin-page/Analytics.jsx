import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
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

  /* ================= STATE ================= */
  const [salesData, setSalesData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [todaySales, setTodaySales] = useState(0);
  const [weeklySales, setWeeklySales] = useState(0);

  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [reservations, setReservations] = useState([]);

  const [selectedChart, setSelectedChart] = useState("all");
  const [selectedReservation, setSelectedReservation] = useState(null);

  const [selectedDate, setSelectedDate] = useState(null);
  const [closedDates, setClosedDates] = useState({});

  /* ================= HELPERS ================= */
  const formatCurrency = (amount) =>
    `₱${Number(amount || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  const reservationsForSelectedDate = selectedDate
    ? reservations.filter((r) => {
        if (!r.preferredDate?.seconds) return false;
        const rDate = new Date(r.preferredDate.seconds * 1000);
        return rDate.toDateString() === selectedDate.toDateString();
      })
    : [];

  /* ================= FIRESTORE LISTENERS ================= */
  useEffect(() => {
    // ---------- SALES ----------
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

      setChartData(
        Object.entries(grouped).map(([date, total]) => ({ date, total }))
      );

      const now = new Date();
      const today = now.toDateString();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      let todayTotal = 0;
      let weekTotal = 0;

      data.forEach((sale) => {
        const total = sale.totalAmount || 0;
        const d = sale.createdAt?.seconds
          ? new Date(sale.createdAt.seconds * 1000)
          : null;
        if (!d) return;

        if (d.toDateString() === today) todayTotal += total;
        if (d >= startOfWeek) weekTotal += total;
      });

      setTodaySales(todayTotal);
      setWeeklySales(weekTotal);
    });

    // ---------- CLOSED DATES ----------
    const unsubClosed = onSnapshot(collection(db, "closed_dates"), (snapshot) => {
      const map = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data().date?.toDate();
        if (!d) return;
        d.setHours(0, 0, 0, 0);
        map[d.toDateString()] = {
          id: docSnap.id,
          reason: docSnap.data().reason || "Closed",
        };
      });
      setClosedDates(map);
    });

    // ---------- LOW STOCK ----------
    let combined = [];

    const updateLowStock = (list) => {
      setLowStockProducts(list.filter((p) => Number(p.stock) <= 5).slice(0, 5));
    };

    const unsubTires = onSnapshot(collection(db, "products_tires"), (snap) => {
      const tires = snap.docs.map((d) => ({ id: d.id, type: "Tire", ...d.data() }));
      combined = [...tires, ...combined.filter((p) => p.type !== "Tire")];
      updateLowStock(combined);
    });

    const unsubMags = onSnapshot(collection(db, "products_mags"), (snap) => {
      const mags = snap.docs.map((d) => ({ id: d.id, type: "Mags", ...d.data() }));
      combined = [...combined.filter((p) => p.type !== "Mags"), ...mags];
      updateLowStock(combined);
    });

    // ---------- RESERVATIONS ----------
    const qRes = query(collection(db, "reservations"), orderBy("preferredDate", "asc"));
    const unsubRes = onSnapshot(qRes, (snapshot) => {
      setReservations(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubSales();
      unsubClosed();
      unsubTires();
      unsubMags();
      unsubRes();
    };
  }, []);

  /* ================= RESERVATION ACTIONS ================= */
  const updateStatus = async (status) => {
    await updateDoc(doc(db, "reservations", selectedReservation.id), { status });
    setSelectedReservation((prev) => ({ ...prev, status }));
  };

  const closeDate = async (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    await addDoc(collection(db, "closed_dates"), {
      date: d,
      reason: "Admin closed",
      createdAt: serverTimestamp(),
    });
  };

  const reopenDate = async (key) => {
    await deleteDoc(doc(db, "closed_dates", closedDates[key].id));
  };

  /* ================= UI ================= */
  return (
    <div className="analytics-container">
      {/* HEADER */}
      <div className="analytics-header">
        <h1>Business Analytics</h1>
        <p>Monitor reservations, inventory health, and performance charts.</p>
      </div>

      {/* ================= CALENDAR ================= */}
      <div className="table-card">
        <h2>📆 Reservation Calendar</h2>

        <ReservationCalendar
          reservations={reservations}
          closedDates={closedDates}
          onSelectReservation={setSelectedReservation}
          onSelectDate={setSelectedDate}
        />

        {/* DATE MODAL */}
        {selectedDate && (
          <div className="reservation-modal-overlay" onClick={() => setSelectedDate(null)}>
            <div className="reservation-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Reservations on {selectedDate.toLocaleDateString()}</h2>

              {reservationsForSelectedDate.length ? (
                <ul>
                  {reservationsForSelectedDate.map((r) => (
                    <li
                      key={r.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => {
                        setSelectedReservation(r);
                        setSelectedDate(null);
                      }}
                    >
                      <strong>{r.userName}</strong> — {r.status}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No reservations.</p>
              )}

              {!closedDates[selectedDate.toDateString()] ? (
                <button className="status-btn cancel" onClick={() => closeDate(selectedDate)}>
                  Close Date
                </button>
              ) : (
                <button
                  className="status-btn approve"
                  onClick={() => reopenDate(selectedDate.toDateString())}
                >
                  Re-open Date
                </button>
              )}

              <button className="close-btn" onClick={() => setSelectedDate(null)}>
                Close
              </button>
            </div>
          </div>
        )}

        {/* RESERVATION MODAL */}
        {selectedReservation && !selectedDate && (
          <div className="reservation-modal-overlay" onClick={() => setSelectedReservation(null)}>
            <div className="reservation-modal" onClick={(e) => e.stopPropagation()}>
              <h2>Reservation Details</h2>
              <p><strong>Customer:</strong> {selectedReservation.userName}</p>
              <p><strong>Status:</strong> {selectedReservation.status}</p>

              <div className="status-buttons">
                <button className="status-btn approve" onClick={() => updateStatus("Approved")}>Approve</button>
                <button className="status-btn complete" onClick={() => updateStatus("Completed")}>Completed</button>
                <button className="status-btn cancel" onClick={() => updateStatus("Cancelled")}>Cancel</button>
              </div>

              <button className="close-btn" onClick={() => setSelectedReservation(null)}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= LOW STOCK ================= */}
      <div className="table-card">
        <h2>⚠️ Low Stock Products</h2>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Type</th>
              <th>Stock</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {lowStockProducts.length ? (
              lowStockProducts.map((p) => (
                <tr key={p.id}>
                  <td>{p.brand} {p.model}</td>
                  <td>{p.type}</td>
                  <td>{p.stock}</td>
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
              <tr><td colSpan="4">All stocks sufficient.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ================= SALES ================= */}
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

      <div className="chart-card">
        <h2>📊 Sales Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="total" stroke="#007bff" strokeWidth={3} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Analytics;
