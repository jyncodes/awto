// src/pages/user-page/ReservationPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  runTransaction,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import Calendar from "react-calendar";
import axios from "axios";
import "react-calendar/dist/Calendar.css";
import "../../styles/user-styles/ReservationPage.css";

const ReservationPage = () => {
  const { productId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const passedProduct = location.state?.product || null;
  const [product, setProduct] = useState(passedProduct);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!passedProduct);

  const [serviceType, setServiceType] = useState("Installation");
  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [preferredTime, setPreferredTime] = useState("");
  const [note, setNote] = useState("");
  const [reservedTimes, setReservedTimes] = useState([]);

  const timeSlots = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00"];
  const downpayment = 500;

  // 🔹 Generate auto-increment reservation ID
  const generateReservationId = async () => {
    const counterRef = doc(db, "counters", "reservations");
    return await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      if (!counterSnap.exists()) throw new Error("Counter document not found");
      const lastId = counterSnap.data().lastId || 0;
      const nextId = lastId + 1;
      transaction.update(counterRef, { lastId: nextId });
      return `RES${String(nextId).padStart(5, "0")}`;
    });
  };

  // 🔹 Send confirmation email (optional)
  const sendReservationEmail = async (email, name, appointmentTime) => {
    try {
      await axios.post("http://localhost:5000/send-email", {
        to: email,
        name,
        subject: "Reservation Confirmed",
        htmlContent: `
          <p>Hello ${name},</p>
          <p>Your reservation has been confirmed.</p>
          <p><strong>Appointment Time:</strong> ${appointmentTime}</p>
          <p>Thank you,<br/>Awto Team</p>
        `,
      });
      console.log("✅ Email sent!");
    } catch (error) {
      console.error("❌ Email failed:", error);
    }
  };

  // 🔹 Track user authentication
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // 🔹 Fetch product if not passed via navigation
  useEffect(() => {
    const fetchProduct = async () => {
      if (passedProduct) return;
      try {
        const tiresRef = doc(db, "products_tires", productId);
        const magsRef = doc(db, "products_mags", productId);
        let snap = await getDoc(tiresRef);
        if (!snap.exists()) snap = await getDoc(magsRef);
        if (snap.exists()) setProduct({ ...snap.data(), id: snap.id });
      } catch (err) {
        console.error("Product fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [productId, passedProduct]);

  // 🔹 Load reserved slots to disable times
  useEffect(() => {
    const fetchReservedSlots = async () => {
      if (!productId || !preferredDate) return;
      const start = new Date(preferredDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(preferredDate);
      end.setHours(23, 59, 59, 999);

      const q = query(
        collection(db, "reservations"),
        where("productId", "==", productId),
        where("isCancelled", "==", false)
      );

      try {
        const snapshot = await getDocs(q);
        const takenTimes = snapshot.docs
          .map((doc) => {
            const ts = doc.data().preferredDateTime;
            const dt = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
            return dt;
          })
          .filter((dt) => dt >= start && dt <= end)
          .map((dt) => dt.toTimeString().slice(0, 5));

        setReservedTimes(takenTimes);
      } catch (error) {
        console.error("Error fetching reserved times:", error);
      }
    };
    fetchReservedSlots();
  }, [preferredDate, productId]);

  // 🔹 Handle form submit
  const handleSubmit = async () => {
    if (!user) return alert("You must be logged in to reserve.");
    if (!vehicleBrand || !vehicleModel || !vehicleYear || !plateNumber || !preferredTime)
      return alert("Please fill out all required fields.");

    if (!product || !product.brand || !product.size)
      return alert("Product information is incomplete.");

    if (reservedTimes.includes(preferredTime))
      return alert("Selected time is already reserved.");

    try {
      const reservationId = await generateReservationId();
      const date = new Date(preferredDate);
      const [hour, minute] = preferredTime.split(":");
      date.setHours(parseInt(hour), parseInt(minute), 0, 0);

      const productName = `${product.brand} ${product.model || ""} ${product.size}`.trim();

      const reservationData = {
        id: reservationId,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || "Customer",
        productId: product.id,
        productName,
        brand: product.brand,
        model: product.model || "",
        size: product.size,
        type: product.type || "",
        price: Number(product.price || 0),
        downpayment,
        serviceType,
        vehicleBrand,
        vehicleModel,
        vehicleYear,
        plateNumber,
        preferredDateTime: Timestamp.fromDate(date),
        note,
        paymentMethod: "PayMongo",
        status: "Pending Payment",
        isCancelled: false,
        reminderSent: false,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "reservations", reservationId), reservationData);

      alert("✅ Reservation submitted successfully!");
      const appointmentTime = date.toLocaleString();

      // Optional email confirmation
      await sendReservationEmail(user.email, user.displayName || "Customer", appointmentTime);

      // 🔹 Redirect to invoice page with data
      navigate(`/invoice/${reservationId}`, { state: { reservation: reservationData } });
    } catch (err) {
      console.error("Reservation submission error:", err);
      alert("Failed to submit reservation. Please try again.");
    }
  };

  if (loading) return <div className="reservation-page">Loading...</div>;
  if (!product) return <div className="reservation-page">Product not found.</div>;

  return (
    <div className="reservation-page">
      <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
      <h2>Reserve: {product.brand} {product.model} {product.size}</h2>

      <div className="reservation-form">
        <label>Service Type</label>
        <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
          <option>Installation</option>
          <option>Wheel Alignment</option>
          <option>Balancing</option>
        </select>

        <label>Vehicle Info</label>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <input value={vehicleBrand} onChange={(e) => setVehicleBrand(e.target.value)} placeholder="Brand (e.g. Toyota)" />
          <input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Model (e.g. Vios)" />
          <input value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} placeholder="Year (e.g. 2020)" />
        </div>

        <label>Plate Number</label>
        <input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="e.g. ABC 1234" />

        <label>Preferred Date</label>
        <Calendar onChange={setPreferredDate} value={preferredDate} minDate={new Date()} />

        <label>Preferred Time</label>
        <select value={preferredTime} onChange={(e) => setPreferredTime(e.target.value)}>
          <option value="">Select a time</option>
          {timeSlots.map((slot) => {
            const [hour, minute] = slot.split(":").map(Number);
            const now = new Date();
            const selected = new Date(preferredDate);
            selected.setHours(hour, minute, 0, 0);

            const isToday = preferredDate.toDateString() === now.toDateString();
            const isPast = isToday && selected.getTime() <= now.getTime();
            const isReserved = reservedTimes.includes(slot);
            const isDisabled = isPast || isReserved;

            return (
              <option key={slot} value={slot} disabled={isDisabled}>
                {slot} {isReserved ? "(Reserved)" : ""}
              </option>
            );
          })}
        </select>

        <label>Additional Notes</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Request or instruction..." />

        <div className="price-summary">
          <p><strong>Price:</strong> ₱{product.price}</p>
          <p><strong>Downpayment:</strong> ₱{downpayment}</p>
        </div>

        <button className="submit-btn" onClick={handleSubmit}>
          Submit Reservation
        </button>
      </div>
    </div>
  );
};

export default ReservationPage;
