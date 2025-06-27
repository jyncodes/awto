import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import '../../styles/admin-styles/AdminDashboardContent.css';

const AdminDashboardContent = () => {
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalSales, setTotalSales] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'sales'), (snapshot) => {
      let orders = 0;
      let sales = 0;
      const customers = new Set();

      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        orders++;
        sales += Number(data.totalAmount || 0);
        customers.add(data.customerName);
      });

      setTotalOrders(orders);
      setTotalSales(sales);
      setTotalCustomers(customers.size);
    });

    return () => unsubscribe();
  }, []);

  const formatCurrency = (amount) =>
    `₱${Number(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">📊 Admin Dashboard</h1>
      </div>

      <div className="summary-cards-grid">
        <SummaryCard
          title="Total Orders"
          value={totalOrders.toLocaleString()}
          icon="🧾"
          bg="purple"
          tooltip="Click to view all orders"
          onClick={() => navigate('/admin/orders')}
        />
        <SummaryCard
          title="Total Sales"
          value={formatCurrency(totalSales)}
          icon="💰"
          bg="green"
          tooltip="Total sales amount"
        />
        <SummaryCard
          title="Total Customers"
          value={totalCustomers}
          icon="👥"
          bg="pink"
          tooltip="Unique customers"
        />
      </div>
    </div>
  );
};

// Reusable card component
const SummaryCard = ({ title, value, icon, bg, tooltip, onClick }) => {
  return (
    <div
      className={`card ${bg}-bg`}
      title={tooltip}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className="card-content">
        <p className="card-label">{title}</p>
        <h2 className="card-value">{value}</h2>
      </div>
      <div className="card-icon-wrapper">
        <span className="card-icon-text">{icon}</span>
      </div>
    </div>
  );
};

export default AdminDashboardContent;
