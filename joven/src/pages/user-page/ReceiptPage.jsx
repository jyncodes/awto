import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/user-styles/ReceiptPage.css";

const ReceiptPage = () => {
  const { reservationId } = useParams();
  const navigate = useNavigate();

  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const docRef = doc(db, "reservations", reservationId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setReceipt(docSnap.data());
        } else {
          alert("❌ Reservation not found.");
          navigate("/profile?tab=reservations");
        }
      } catch (err) {
        console.error("❌ Error fetching receipt:", err);
        alert("Failed to load receipt.");
        navigate("/profile?tab=reservations");
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [reservationId, navigate]);

  if (loading) {
    return <div className="receipt-page">Loading receipt...</div>;
  }

  if (!receipt) return null;

  const formattedDateTime =
    receipt.preferredDateTime?.toDate?.().toLocaleString?.() || "Unavailable";

  return (
    <div className="receipt-page">
      <h2>Official Receipt</h2>
      <div className="receipt-card">
        <p><strong>Product:</strong> {receipt.productName}</p>
        <p><strong>Brand:</strong> {receipt.brand}</p>
        <p><strong>Vehicle:</strong> {`${receipt.vehicleBrand} ${receipt.vehicleModel} ${receipt.vehicleYear}`}</p>
        <p><strong>Plate Number:</strong> {receipt.plateNumber}</p>
        <p><strong>Date & Time:</strong> {formattedDateTime}</p>
        <p><strong>Service Type:</strong> {receipt.serviceType}</p>
        <p><strong>Total Price:</strong> ₱{receipt.price}</p>
        <p><strong>Downpayment (30%):</strong> ₱{receipt.downpayment}</p>
        <p><strong>Status:</strong> {receipt.status}</p>
        <p><strong>Payment:</strong> {receipt.paymentStatus || "unpaid"}</p>
      </div>

      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>
    </div>
  );
};

export default ReceiptPage;
