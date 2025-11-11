import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import "../../styles/admin-styles/Financials.css";

const Financials = () => {
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [todaySales, setTodaySales] = useState(0);
  const [weeklySales, setWeeklySales] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [profit, setProfit] = useState(0);
  const [expenseForm, setExpenseForm] = useState({
    category: "",
    description: "",
    amount: "",
  });

  const formatCurrency = (num) =>
    `₱${Number(num || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  // === Fetch Sales ===
  useEffect(() => {
    const qSales = query(collection(db, "sales"), orderBy("createdAt", "desc"));
    const unsubSales = onSnapshot(qSales, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setSales(data);

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

        if (date) {
          if (date.toDateString() === today) todayTotal += total;
          if (date >= startOfWeek) weekTotal += total;
        }
      });

      setTodaySales(todayTotal);
      setWeeklySales(weekTotal);
    });

    return () => unsubSales();
  }, []);

  // === Fetch Expenses ===
  useEffect(() => {
    const qExpenses = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setExpenses(data);

      const total = data.reduce((sum, e) => sum + Number(e.amount || 0), 0);
      setTotalExpenses(total);
    });

    return () => unsubExpenses();
  }, []);

  // === Compute Profit ===
  useEffect(() => {
    const net = weeklySales - totalExpenses;
    setProfit(net);
  }, [weeklySales, totalExpenses]);

  // === Add Expense ===
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.category || !expenseForm.amount) {
      alert("Please complete all fields.");
      return;
    }

    try {
      await addDoc(collection(db, "expenses"), {
        ...expenseForm,
        amount: Number(expenseForm.amount),
        createdAt: Timestamp.now(),
      });
      alert("✅ Expense added successfully.");
      setExpenseForm({ category: "", description: "", amount: "" });
    } catch (err) {
      console.error("Error adding expense:", err);
      alert("❌ Failed to add expense.");
    }
  };

  // === Delete Expense ===
  const handleDeleteExpense = async (id) => {
    if (!window.confirm("Are you sure you want to delete this expense?")) return;
    try {
      await deleteDoc(doc(db, "expenses", id));
      alert("🗑️ Expense deleted.");
    } catch (err) {
      console.error("Error deleting expense:", err);
    }
  };

  return (
    <div className="finance-container">
      <div className="finance-header">
        <h1>Financial Overview</h1>
        <p>Monitor sales, track expenses, and view net profit.</p>
      </div>

      {/* Summary Cards */}
      <div className="finance-summary">
        <div className="finance-card blue">
          <h3>Today's Sales</h3>
          <p>{formatCurrency(todaySales)}</p>
        </div>
        <div className="finance-card green">
          <h3>This Week's Sales</h3>
          <p>{formatCurrency(weeklySales)}</p>
        </div>
        <div className="finance-card red">
          <h3>Total Expenses</h3>
          <p>{formatCurrency(totalExpenses)}</p>
        </div>
        <div className={`finance-card ${profit >= 0 ? "purple" : "gray"}`}>
          <h3>Net Profit</h3>
          <p>{formatCurrency(profit)}</p>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="finance-section">
        <h2>🧾 Recent Sales</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Customer</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sales.slice(0, 5).map((sale) => (
              <tr key={sale.id}>
                <td>
                  {sale.createdAt
                    ? new Date(sale.createdAt.seconds * 1000).toLocaleDateString()
                    : "N/A"}
                </td>
                <td>{sale.customerName || "Walk-in"}</td>
                <td>{formatCurrency(sale.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Expense Form */}
      <div className="finance-section">
        <h2>💸 Add Expense</h2>
        <form onSubmit={handleAddExpense} className="expense-form">
          <input
            type="text"
            placeholder="Category (e.g. Rent, Salary)"
            value={expenseForm.category}
            onChange={(e) =>
              setExpenseForm({ ...expenseForm, category: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Amount"
            value={expenseForm.amount}
            onChange={(e) =>
              setExpenseForm({ ...expenseForm, amount: e.target.value })
            }
          />
          <input
            type="text"
            placeholder="Description"
            value={expenseForm.description}
            onChange={(e) =>
              setExpenseForm({ ...expenseForm, description: e.target.value })
            }
          />
          <button type="submit">Add Expense</button>
        </form>
      </div>

      {/* Expense List */}
      <div className="finance-section">
        <h2>📉 Expense List</h2>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {expenses.length > 0 ? (
              expenses.map((exp) => (
                <tr key={exp.id}>
                  <td>{exp.category}</td>
                  <td>{exp.description || "—"}</td>
                  <td>{formatCurrency(exp.amount)}</td>
                  <td>
                    {exp.createdAt
                      ? new Date(exp.createdAt.seconds * 1000).toLocaleDateString()
                      : "N/A"}
                  </td>
                  <td>
                    <button
                      className="delete-expense"
                      onClick={() => handleDeleteExpense(exp.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5">No expenses recorded.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Financials;
