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
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);

  const [expenseForm, setExpenseForm] = useState({
    category: "",
    description: "",
    amount: "",
  });

  const [balanceForm, setBalanceForm] = useState({
    type: "Asset",
    name: "",
    value: "",
  });

  const formatCurrency = (num) =>
    `₱${Number(num || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
    })}`;

  // ======== SALES FETCH ========
  useEffect(() => {
    const q = query(collection(db, "sales"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setSales(data);
    });
    return () => unsub();
  }, []);

  // ======== EXPENSES FETCH ========
  useEffect(() => {
    const q = query(collection(db, "expenses"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setExpenses(data);
    });
    return () => unsub();
  }, []);

  // ======== BALANCE SHEET FETCH ========
  useEffect(() => {
    const qAssets = query(collection(db, "assets"), orderBy("createdAt", "desc"));
    const qLiab = query(
      collection(db, "liabilities"),
      orderBy("createdAt", "desc")
    );

    const unsubA = onSnapshot(qAssets, (snapshot) => {
      setAssets(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    const unsubL = onSnapshot(qLiab, (snapshot) => {
      setLiabilities(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubA();
      unsubL();
    };
  }, []);

  // ======== COMPUTATIONS ========
  const totalSales = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalSales - totalExpenses;

  const totalAssets = assets.reduce((sum, a) => sum + (a.value || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + (l.value || 0), 0);
  const totalEquity = totalAssets - totalLiabilities;

  // ======== ADD EXPENSE ========
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!expenseForm.category || !expenseForm.amount) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      await addDoc(collection(db, "expenses"), {
        ...expenseForm,
        amount: Number(expenseForm.amount),
        createdAt: Timestamp.now(),
      });
      setExpenseForm({ category: "", description: "", amount: "" });
    } catch (error) {
      console.error("Error adding expense:", error);
    }
  };

  // ======== ADD BALANCE ITEM ========
  const handleAddBalance = async (e) => {
    e.preventDefault();
    if (!balanceForm.name || !balanceForm.value) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const targetCollection =
        balanceForm.type === "Asset" ? "assets" : "liabilities";
      await addDoc(collection(db, targetCollection), {
        name: balanceForm.name,
        value: Number(balanceForm.value),
        createdAt: Timestamp.now(),
      });
      setBalanceForm({ type: "Asset", name: "", value: "" });
    } catch (error) {
      console.error("Error adding balance item:", error);
    }
  };

  // ======== DELETE EXPENSE / BALANCE ========
  const handleDelete = async (col, id) => {
    if (!window.confirm("Delete this record?")) return;
    try {
      await deleteDoc(doc(db, col, id));
    } catch (err) {
      console.error("Error deleting record:", err);
    }
  };

  return (
    <div className="financials-container">
      <h1 className="finance-title">Financial Overview</h1>

      {/* ================== INCOME STATEMENT ================== */}
      <div className="finance-section">
        <h2>📊 Income Statement</h2>

        <div className="finance-tables">
          {/* SALES TABLE */}
          <div className="finance-table">
            <h3>Sales</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {sales.length > 0 ? (
                  sales.map((s) => (
                    <tr key={s.id}>
                      <td>
                        {s.createdAt
                          ? new Date(s.createdAt.seconds * 1000).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td>{s.customerName || "Walk-in"}</td>
                      <td>{formatCurrency(s.totalAmount)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">No sales recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* EXPENSES TABLE */}
          <div className="finance-table">
            <h3>Expenses</h3>
            <form onSubmit={handleAddExpense} className="form-row">
              <input
                type="text"
                placeholder="Category"
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
                {expenses.length > 0 ? (
                  expenses.map((exp) => (
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
                    <td colSpan="4">No expenses recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="summary">
          <p>Total Sales: <strong>{formatCurrency(totalSales)}</strong></p>
          <p>Total Expenses: <strong>{formatCurrency(totalExpenses)}</strong></p>
          <p>
            Net Profit:{" "}
            <strong style={{ color: netProfit >= 0 ? "green" : "red" }}>
              {formatCurrency(netProfit)}
            </strong>
          </p>
        </div>
      </div>

      {/* ================== BALANCE SHEET ================== */}
      <div className="finance-section">
        <h2>📘 Balance Sheet</h2>

        <form onSubmit={handleAddBalance} className="form-row">
          <select
            value={balanceForm.type}
            onChange={(e) =>
              setBalanceForm({ ...balanceForm, type: e.target.value })
            }
          >
            <option>Asset</option>
            <option>Liability</option>
          </select>
          <input
            type="text"
            placeholder="Name"
            value={balanceForm.name}
            onChange={(e) =>
              setBalanceForm({ ...balanceForm, name: e.target.value })
            }
          />
          <input
            type="number"
            placeholder="Value"
            value={balanceForm.value}
            onChange={(e) =>
              setBalanceForm({ ...balanceForm, value: e.target.value })
            }
          />
          <button type="submit">Add</button>
        </form>

        <div className="finance-tables">
          <div className="finance-table">
            <h3>Assets</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {assets.length > 0 ? (
                  assets.map((a) => (
                    <tr key={a.id}>
                      <td>{a.name}</td>
                      <td>{formatCurrency(a.value)}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete("assets", a.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">No assets recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="finance-table">
            <h3>Liabilities</h3>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Value</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {liabilities.length > 0 ? (
                  liabilities.map((l) => (
                    <tr key={l.id}>
                      <td>{l.name}</td>
                      <td>{formatCurrency(l.value)}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete("liabilities", l.id)}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3">No liabilities recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="summary">
          <p>Total Assets: <strong>{formatCurrency(totalAssets)}</strong></p>
          <p>Total Liabilities: <strong>{formatCurrency(totalLiabilities)}</strong></p>
          <p>
            Owner’s Equity:{" "}
            <strong style={{ color: "#2563eb" }}>
              {formatCurrency(totalEquity)}
            </strong>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Financials;
