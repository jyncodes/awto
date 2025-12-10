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
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'customers'), async (snapshot) => {
      const list = await Promise.all(
        snapshot.docs.map(async (docSnap) => {
          const c = docSnap.data();

          const lookupId = c.uid || c.customerCode || docSnap.id;

          const reservationsQuery = query(
            collection(db, 'reservations'),
            where('userId', '==', lookupId)
          );
          const reservationsSnap = await getDocs(reservationsQuery);

          return {
            id: docSnap.id,
            ...c,
            totalReservations: reservationsSnap.size,
          };
        })
      );

      setCustomers(list);
    });

    return () => unsub();
  }, []);

  const filtered = customers.filter((c) => {
    const searchable = `${c.name || ''} ${c.email || ''} ${c.customerCode || ''}`.toLowerCase();
    return searchable.includes(searchTerm.toLowerCase());
  });

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
              <th>Customer ID</th>
              <th>Name</th>
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
                  <td>{customer.customerCode || '—'}</td>
                  <td>{customer.name || '—'}</td>
                  <td>
                    {customer.registeredAt
                      ? new Date(customer.registeredAt.seconds * 1000).toLocaleString()
                      : '—'}
                  </td>
                  <td>{customer.totalReservations || 0}</td>
                  <td>
                    <button
                      className="view-btn"
                      onClick={() => setSelectedCustomer(customer)}
                    >
                      👁 View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* VIEW MODAL */}
      {selectedCustomer && (
        <div className="modal-overlay" onClick={() => setSelectedCustomer(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>👤 Customer Details</h2>
            <p><strong>Customer ID:</strong> {selectedCustomer.customerCode}</p>
            <p><strong>Name:</strong> {selectedCustomer.name || '—'}</p>
            <p><strong>Email:</strong> {selectedCustomer.email || 'Walk-in'}</p>
            <p><strong>Contact:</strong> {selectedCustomer.contact || '—'}</p>
            <p><strong>Address:</strong> {selectedCustomer.address || '—'}</p>
            <p><strong>Gender:</strong> {selectedCustomer.gender || '—'}</p>
            <p><strong>Birthday:</strong> {selectedCustomer.birthday || '—'}</p>
            <p><strong>Total Reservations:</strong> {selectedCustomer.totalReservations}</p>

            <button className="close-btn" onClick={() => setSelectedCustomer(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;
