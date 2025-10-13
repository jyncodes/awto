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

  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [preferredDate, setPreferredDate] = useState(null);
  const [fullyBookedDates, setFullyBookedDates] = useState([]);
  const [note, setNote] = useState("");

  const downpayment = 500;
  const MAX_BOOKINGS_PER_DATE = 3;
  const BREVO_SERVER_URL = import.meta.env.VITE_BREVO_SERVER_URL || "http://localhost:5000";

  // ✅ Generate auto-increment reservation ID
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

  // ✅ Send confirmation email
  const sendReservationEmail = async (email, name, appointmentDate, reservationId, productName) => {
    console.log("📨 Preparing to send reservation email...");
    console.log("📧 To:", email);
    console.log("👤 Name:", name);
    console.log("🪪 Reservation ID:", reservationId);
    console.log("📅 Appointment Date:", appointmentDate);
    console.log("🛞 Product:", productName);

    const payload = {
      to: email,
      name,
      subject: `Reservation Confirmed - ${reservationId}`,
      htmlContent: `
        <h3>Hello ${name},</h3>
        <p>Your reservation has been successfully submitted.</p>
        <ul>
          <li><strong>Reservation ID:</strong> ${reservationId}</li>
          <li><strong>Product:</strong> ${productName}</li>
          <li><strong>Appointment Date:</strong> ${appointmentDate}</li>
        </ul>
        <p>Thank you for choosing Awto!</p>
      `,
    };

    try {
      console.log("📤 Sending payload to Brevo server:", payload);
      const response = await axios.post(`${BREVO_SERVER_URL}/send-email`, payload);
      console.log("✅ Email sent successfully!");
      console.log("📨 Server response:", response.data);
    } catch (error) {
      console.error("❌ Failed to send confirmation email.");
      if (error.response) {
        console.error("📡 Brevo server responded with:", error.response.data);
        console.error("📊 Status code:", error.response.status);
      } else if (error.request) {
        console.error("🌐 No response received from Brevo server.");
        console.error("📝 Request details:", error.request);
      } else {
        console.error("⚠️ Error:", error.message);
      }
      // Do not throw — so the reservation will still proceed even if email fails
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
      if (passedProduct) {
        setLoading(false);
        return;
      }
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

  // 🔹 Load fully booked dates
  useEffect(() => {
    const fetchFullyBooked = async () => {
      try {
        const q = query(
          collection(db, "reservations"),
          where("productId", "==", productId),
          where("isCancelled", "==", false)
        );
        const snapshot = await getDocs(q);

        const dateCounts = {};
        snapshot.forEach((docSnap) => {
          const ts = docSnap.data().preferredDate;
          const dt = ts instanceof Timestamp ? ts.toDate() : new Date(ts);
          const key = dt.toDateString();
          dateCounts[key] = (dateCounts[key] || 0) + 1;
        });

        const fullyBooked = Object.keys(dateCounts).filter(
          (d) => dateCounts[d] >= MAX_BOOKINGS_PER_DATE
        );
        setFullyBookedDates(fullyBooked);
      } catch (error) {
        console.error("Error fetching fully booked dates:", error);
      }
    };
    fetchFullyBooked();
  }, [productId]);

  // 🧱 Helper: Build product details
  const buildProductDetails = (prod) => {
    if (!prod) return { productName: "Unknown Product", size: "", type: "" };
    const type = prod.type || (prod.productId?.startsWith("MA-") ? "Mags" : "Tire") || "";
    if (type.toLowerCase().includes("tire")) {
      const w = prod.tireWidth || prod.width || "";
      const ar = prod.aspectRatio || prod.aspect || "";
      const rim = prod.rimDiameter || prod.rim || "";
      const sizeParts = [];
      if (w) sizeParts.push(w);
      if (ar) sizeParts.push(ar);
      const size = sizeParts.length
        ? `${sizeParts.join("/")}R${rim || ""}`.replace(/R$/, "")
        : prod.size || "";
      const productName = `${prod.brand || ""} ${prod.model || ""} ${size}`.trim();
      return { productName: productName || prod.name || prod.productId || "Tire", size, type: "Tire" };
    }
    if (type.toLowerCase().includes("mag") || type.toLowerCase().includes("wheel")) {
      const w = prod.wheelWidth || prod.wheel_width || prod.wheelwidth || "";
      const dia = prod.wheelDiameter || prod.rimDiameter || prod.rim || prod.wheel_diameter || "";
      const size = w && dia ? `${w}x${dia}` : prod.size || "";
      const productName = `${prod.brand || ""} ${prod.model || ""} ${size}`.trim();
      return { productName: productName || prod.name || prod.productId || "Mags", size, type: "Mags" };
    }
    const fallbackName = `${prod.brand || ""} ${prod.model || ""} ${prod.size || ""}`.trim();
    return { productName: fallbackName || prod.name || prod.productId || "Product", size: prod.size || "", type: type || "" };
  };

  // ✅ Handle reservation submission
  const handleSubmit = async () => {
    if (!user) return alert("You must be logged in to reserve.");
    if (
      !vehicleBrand.trim() ||
      !vehicleModel.trim() ||
      !vehicleYear.trim() ||
      !plateNumber.trim() ||
      !preferredDate
    )
      return alert("Please fill out all required fields.");
    if (!product) return alert("Product information is not available.");

    const today = new Date();
    const minAllowedDate = new Date();
    minAllowedDate.setDate(today.getDate() + 1);
    minAllowedDate.setHours(0, 0, 0, 0);

    const chosenDate = new Date(preferredDate);
    chosenDate.setHours(0, 0, 0, 0);

    if (chosenDate < minAllowedDate) {
      return alert("You can only book at least 24 hours in advance.");
    }

    const chosenKey = chosenDate.toDateString();
    if (fullyBookedDates.includes(chosenKey)) {
      return alert("This date is fully booked. Please choose another date.");
    }

    try {
      const reservationId = await generateReservationId();
      const { productName, size, type } = buildProductDetails(product);

      const reservationData = {
        id: reservationId,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || "Customer",
        productId: product.id || product.productId || productId,
        productName,
        brand: product.brand || "Unknown",
        model: product.model || "",
        size: size || "",
        type: type || product.type || "",
        price: Number(product.price || 0),
        downpayment,
        vehicleBrand: vehicleBrand.trim(),
        vehicleModel: vehicleModel.trim(),
        vehicleYear: vehicleYear.trim(),
        plateNumber: plateNumber.trim(),
        preferredDate: Timestamp.fromDate(chosenDate),
        note: note.trim(),
        paymentMethod: "PayMongo",
        status: "Pending Payment",
        isCancelled: false,
        reminderSent: false,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "reservations", reservationId), reservationData);

      // ✉️ Send confirmation email (non-blocking)
      const appointmentDate = chosenDate.toLocaleDateString();
      sendReservationEmail(
        user.email,
        user.displayName || "Customer",
        appointmentDate,
        reservationId,
        productName
      );

      alert("✅ Reservation submitted successfully!");
      navigate(`/invoice/${reservationId}`, { state: { reservation: reservationData } });
    } catch (err) {
      console.error("Reservation submission error:", err);
      alert("Failed to submit reservation. Please try again.");
    }
  };

  const tileDisabled = ({ date }) => {
    const now = new Date();
    const key = date.toDateString();
    if (date <= now) return true;
    if (fullyBookedDates.includes(key)) return true;
    return false;
  };

  if (loading) return <div className="reservation-page">Loading...</div>;
  if (!product) return <div className="reservation-page">Product not found.</div>;

  const { productName: headerName } = buildProductDetails(product);

  return (
    <div className="reservation-page">
      <button className="back-button" onClick={() => navigate(-1)}>← Back</button>
      <h2>Reserve: {headerName}</h2>

      <div className="reservation-form">
        <label>Vehicle Info</label>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <input value={vehicleBrand} onChange={(e) => setVehicleBrand(e.target.value)} placeholder="Brand (e.g. Toyota)" />
          <input value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} placeholder="Model (e.g. Vios)" />
          <input value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} placeholder="Year (e.g. 2020)" />
        </div>

        <label>Plate Number</label>
        <input value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} placeholder="e.g. ABC 1234" />

        <label>Preferred Date</label>
        <Calendar
          onChange={setPreferredDate}
          value={preferredDate}
          minDate={new Date()}
          tileDisabled={tileDisabled}
        />

        <label>Additional Notes</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Request or instruction..."
        />

        <div className="price-summary">
          <p><strong>Price:</strong> ₱{Number(product.price || 0)}</p>
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
