// 📄 src/pages/admin-dashboard/AdminDashboardContent.jsx
import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import "../../styles/admin-styles/AdminDashboardContent.css";

const AdminDashboardContent = () => {
  const [salesData, setSalesData] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [monthlySales, setMonthlySales] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [upcomingReservations, setUpcomingReservations] = useState([]);
  const [productDistribution, setProductDistribution] = useState([]);

  // ✅ Format currency
  const formatCurrency = (amount) =>
    `₱${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  useEffect(() => {
    // 🧾 Sync live SALES data (fixed: use createdAt instead of date)
    const qSales = query(collection(db, "sales"), orderBy("createdAt", "desc"));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSalesData(data);
      setRecentSales(data.slice(0, 5));
    });

    // 📅 Monthly Sales Summary (for chart)
    const unsubMonthly = onSnapshot(collection(db, "sales"), (snapshot) => {
      const salesByMonth = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.createdAt?.seconds) {
          const date = new Date(data.createdAt.seconds * 1000);
          const month = date.toLocaleString("default", { month: "short" });
          salesByMonth[month] = (salesByMonth[month] || 0) + (data.totalAmount || 0);
        }
      });
      const chartData = Object.entries(salesByMonth).map(([month, total]) => ({
        month,
        total,
      }));
      setMonthlySales(chartData);
    });

    // 📦 PRODUCTS (low stock + distribution)
    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const lowStock = [];
      const categoryTotals = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.stock <= 5) lowStock.push({ id: doc.id, ...data });
        const cat = data.category || "Uncategorized";
        categoryTotals[cat] = (categoryTotals[cat] || 0) + 1;
      });

      setLowStockProducts(lowStock.slice(0, 5));
      const dist = Object.entries(categoryTotals).map(([name, value]) => ({
        name,
        value,
      }));
      setProductDistribution(dist);
    });

    // 🧾 UPCOMING RESERVATIONS
    const qRes = query(collection(db, "reservations"), orderBy("date", "asc"), limit(5));
    const unsubRes = onSnapshot(qRes, (snapshot) => {
      const reservations = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setUpcomingReservations(reservations);
    });

    return () => {
      unsubSales();
      unsubMonthly();
      unsubProducts();
      unsubRes();
    };
  }, []);

  // 🎨 Chart colors for pie
  const chartColors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">📊 Business Analytics</h1>
        <p className="dashboard-subtitle">
          Real-time analytics synced with the Sales system for accurate insights.
        </p>
      </div>

      {/* =========================
          SALES CHART (Monthly)
      ========================== */}
      <div className="chart-card">
        <h2>💰 Monthly Sales</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={monthlySales}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(v) => formatCurrency(v)} />
            <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* =========================
          PRODUCT DISTRIBUTION PIE
      ========================== */}
      <div className="chart-card">
        <h2>🛞 Product Category Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={productDistribution}
              dataKey="value"
              nameKey="name"
              outerRadius={110}
              label
            >
              {productDistribution.map((_, index) => (
                <Cell key={index} fill={chartColors[index % chartColors.length]} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* =========================
          TABLES SECTION
      ========================== */}
      <div className="overview-section">
        {/* Recent Sales */}
        <div className="overview-card">
          <div className="overview-header">
            <h2>🧾 Recent Sales</h2>
            <p className="overview-subtitle">
              Fetched live from <code>sales</code> collection used by Sales.jsx
            </p>
          </div>
          <table className="overview-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.length > 0 ? (
                recentSales.map((sale) => (
                  <tr key={sale.id}>
                    <td>{sale.customerName || "N/A"}</td>
                    <td>
                      {sale.createdAt
                        ? new Date(sale.createdAt.seconds * 1000).toLocaleDateString()
                        : "-"}
                    </td>
                    <td>{formatCurrency(sale.totalAmount || 0)}</td>
                    <td>{sale.status || "Completed"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4">No recent sales</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Low Stock */}
        <div className="overview-card">
          <div className="overview-header">
            <h2>⚠️ Low Stock Products</h2>
          </div>
          <table className="overview-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
              </tr>
            </thead>
            <tbody>
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.category || "N/A"}</td>
                    <td>{item.stock}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3">No low stock products</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Reservations */}
        <div className="overview-card">
          <div className="overview-header">
            <h2>📅 Upcoming Reservations</h2>
          </div>
          <table className="overview-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Service</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {upcomingReservations.length > 0 ? (
                upcomingReservations.map((res) => (
                  <tr key={res.id}>
                    <td>{res.customerName || "N/A"}</td>
                    <td>{res.service || "N/A"}</td>
                    <td>
                      {res.date
                        ? new Date(res.date.seconds * 1000).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3">No upcoming reservations</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardContent;
