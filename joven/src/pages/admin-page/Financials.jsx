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

  const [expenseForm, setExpenseForm] = useState({
    category: "",
    amount: "",
  });

  const formatCurrency = (num) =>
    `₱${Number(num || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  // ======== SALES FETCH ========
  useEffect(() => {
    const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setSales(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // ======== EXPENSES FETCH ========
  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setExpenses(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // ======== THIS MONTH FILTER ========
  const now = new Date();
  const thisMonthSales = sales.filter((s) => {
    const d = s.createdAt ? new Date(s.createdAt.seconds * 1000) : null;
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const thisMonthExpenses = expenses.filter((e) => {
    const d = e.createdAt ? new Date(e.createdAt.seconds * 1000) : null;
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  // ======== COMPUTATIONS ========
  const totalSales = thisMonthSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalExpenses = thisMonthExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalSales - totalExpenses;

  // ======== ADD EXPENSE ========
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.category || !expenseForm.amount) {
      alert("Category and amount required.");
      return;
    }

    try {
      await addDoc(collection(db, "expenses"), {
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        createdAt: Timestamp.now(),
      });
      setExpenseForm({ category: "", amount: "" });
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  // ======== DELETE EXPENSE ========
  const handleDelete = async (col, id) => {
    if (!window.confirm("Delete this record?")) return;
    await deleteDoc(doc(db, col, id));
  };

  return (
    <div className="financials-container">
      <h1 className="finance-title">Financial Overview</h1>

      {/* ================== SUMMARY AT TOP ================== */}
      <div className="summary-top">
        <div className="summary-card">
          <h3>Total Sales (This Month)</h3>
          <p className="summary-value green">{formatCurrency(totalSales)}</p>
        </div>

        <div className="summary-card">
          <h3>Total Expenses (This Month)</h3>
          <p className="summary-value red">{formatCurrency(totalExpenses)}</p>
        </div>

        <div className="summary-card">
          <h3>Net Profit</h3>
          <p
            className="summary-value"
            style={{ color: netProfit >= 0 ? "#22c55e" : "#ef4444" }}
          >
            {formatCurrency(netProfit)}
          </p>
        </div>
      </div>

      {/* ================== INCOME STATEMENT ================== */}
      <div className="finance-section">
        <h2>📊 Income Statement</h2>

        <div className="finance-tables">

          {/* ================= SALES TABLE (1 ROW ONLY) ================= */}
          <div className="finance-table">
            <h3>Sales (Summary Only)</h3>
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Total Sales</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{now.toLocaleString("default", { month: "long" })}</td>
                  <td>{formatCurrency(totalSales)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ================= EXPENSES TABLE ================= */}
          <div className="finance-table">
            <h3>Expenses</h3>

            <form onSubmit={handleAddExpense} className="form-row">

              {/* TEXT INPUT INSTEAD OF DROPDOWN */}
              <input
                type="text"
                placeholder="Expense Category"
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

              <button type="submit">Add</button>
            </form>

            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {thisMonthExpenses.length > 0 ? (
                  thisMonthExpenses.map((exp) => (
                    <tr key={exp.id}>
                      <td>{exp.category}</td>
                      <td>{formatCurrency(exp.amount)}</td>
                      <td>
                        {exp.createdAt
                          ? new Date(exp.createdAt.seconds * 1000).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete("expenses", exp.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4">No expenses recorded this month.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Financials;
