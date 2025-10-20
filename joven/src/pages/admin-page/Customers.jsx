import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import {
  collection,
  onSnapshot,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import '../../styles/admin-styles/Customers.css';

const AdminCustomers = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), async (snapshot) => {
      const userDocs = snapshot.docs.filter(
        (docSnap) => docSnap.data().role === 'User'
      );

      const list = await Promise.all(
        userDocs.map(async (docSnap) => {
          const userData = docSnap.data();

          // 📝 Count total reservations for this user
          const reservationsQuery = query(
            collection(db, 'reservations'),
            where('userId', '==', docSnap.id)
          );
          const reservationsSnap = await getDocs(reservationsQuery);
          const totalReservations = reservationsSnap.size;

          return {
            id: docSnap.id,
            ...userData,
            totalReservations,
          };
        })
      );

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
              <th>Date Joined</th>
              <th>Total Reservations</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center">
                  No customers found.
                </td>
              </tr>
            ) : (
              filtered.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <div className="avatar">
                      {customer.name?.charAt(0).toUpperCase() || '?'}
                    </div>
                  </td>
                  <td>{customer.name || '—'}</td>
                  <td>{customer.email || '—'}</td>
                  <td>
                    {customer.createdAt
                      ? new Date(customer.createdAt.seconds * 1000).toLocaleString()
                      : '—'}
                  </td>
                  <td>{customer.totalReservations || 0}</td>
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
0