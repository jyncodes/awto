// src/pages/user-page/InvoicePage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/Invoice.css";

const InvoicePage = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();
  const [reservation, setReservation] = useState(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const docRef = doc(db, "reservations", reservationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setReservation(docSnap.data());
        } else {
          setReservation(null);
        }
      } catch (error) {
        console.error("Error fetching reservation:", error);
        setReservation(null);
      } finally {
        setLoading(false);
      }
    };

    if (reservationId) {
      fetchInvoice();
    }
  }, [reservationId]);

  if (loading) {
    return <div className="invoice-page">Loading invoice...</div>;
  }

  if (reservation === null) {
    return (
      <div className="invoice-page">
        <h2>Reservation not found.</h2>
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
    );
  }

  // ✅ Safely convert Timestamps to readable strings
  const readableDate = reservation?.preferredDateTime?.toDate?.()
    ? reservation.preferredDateTime.toDate().toLocaleString()
    : "N/A";

  const createdAt = reservation?.createdAt?.toDate?.()
    ? reservation.createdAt.toDate().toLocaleString()
    : "N/A";

  return (
    <div className="invoice-page">
      <div className="invoice-box">
        <h2>Reservation Invoice</h2>
        <p><strong>Invoice ID:</strong> {reservationId}</p>
        <p><strong>Appointment Time:</strong> {readableDate}</p>
        <p><strong>Created At:</strong> {createdAt}</p>

        <hr />

        <h3>Customer Vehicle</h3>
        <p><strong>Brand:</strong> {reservation.vehicleBrand || "N/A"}</p>
        <p><strong>Model:</strong> {reservation.vehicleModel || "N/A"}</p>
        <p><strong>Year:</strong> {reservation.vehicleYear || "N/A"}</p>
        <p><strong>Plate Number:</strong> {reservation.plateNumber || "N/A"}</p>

        <hr />

        <h3>Service & Product</h3>
        <p><strong>Service Type:</strong> {reservation.serviceType || "N/A"}</p>
        <p><strong>Product:</strong> {reservation.productName || "N/A"}</p>
        <p><strong>Size:</strong> {reservation.size || "N/A"}</p>
        <p><strong>Brand:</strong> {reservation.brand || "N/A"}</p>
        <p><strong>Type:</strong> {reservation.type || "N/A"}</p>

        <hr />

        <h3>Payment Details</h3>
        <p><strong>Total Price:</strong> ₱{reservation.price?.toLocaleString() || 0}</p>
        <p><strong>Downpayment:</strong> ₱{reservation.downpayment?.toLocaleString() || 0}</p>
        <p><strong>Payment Method:</strong> {reservation.paymentMethod || "N/A"}</p>

        <hr />

        <p><strong>Status:</strong> {reservation.status || "Pending"}</p>
        <p><strong>Note:</strong> {reservation.note || "None"}</p>

        <div className="button-group">
          <button className="back-button" onClick={() => navigate(-1)}>
            ← Back
          </button>

          <button
            className="continue-button"
            onClick={() => navigate(`/payment/${reservationId}`)}
          >
            Continue to Payment →
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoicePage;
