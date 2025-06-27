import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import '../../styles/admin-styles/Customers.css';

const AdminCustomers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((user) => user.role === 'User'); // ✅ Only include users with role "User"
      setCustomers(list);
    });

    return () => unsub();
  }, []);

  const filtered = customers.filter((c) =>
    `${c.name} ${c.email}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="customers-container">
      <div className="customers-header">
        <h1>👥 Customers</h1>
        <input
          type="text"
          placeholder="Search customers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="customers-search"
        />
      </div>

      <div className="customers-table-wrapper">
        <table className="customers-table">
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center">No customers found.</td>
              </tr>
            ) : (
              filtered.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="avatar">
                      {customer.name?.charAt(0).toUpperCase()}
                    </div>
                  </td>
                  <td>{customer.name || '—'}</td>
                  <td>{customer.email || '—'}</td>
                  <td>
                    <span className={`status-badge ${customer.status?.toLowerCase() || 'inactive'}`}>
                      {customer.status || 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <button className="delete-btn">🗑 Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminCustomers;
