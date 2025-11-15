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

  // 🔥 DYNAMIC DOWNPAYMENT FROM FIRESTORE
  const [downpayment, setDownpayment] = useState(0);
  const [loadingDownpayment, setLoadingDownpayment] = useState(true);

  const MAX_BOOKINGS_PER_DATE = 3;
  const BREVO_SERVER_URL =
    import.meta.env.VITE_BREVO_SERVER_URL || "http://localhost:5000";

  // ================================
  // 🔥 LOAD DOWNPAYMENT
  // ================================
  useEffect(() => {
    const loadDownpayment = async () => {
      try {
        const paymentsRef = doc(db, "settings", "payments");
        const snap = await getDoc(paymentsRef);
        setDownpayment(snap.exists() ? snap.data().downpayment : 0);
      } catch (err) {
        console.error("Error loading downpayment:", err);
        setDownpayment(0);
      } finally {
        setLoadingDownpayment(false);
      }
    };
    loadDownpayment();
  }, []);

  // ================================
  // 🔥 LOAD USER
  // ================================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // ================================
  // 🔥 LOAD PRODUCT
  // ================================
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

  // ================================
  // 🔥 LOAD FULLY BOOKED DATES
  // ================================
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

        setFullyBookedDates(
          Object.keys(dateCounts).filter(
            (d) => dateCounts[d] >= MAX_BOOKINGS_PER_DATE
          )
        );
      } catch (error) {
        console.error("Error fetching fully booked dates:", error);
      }
    };

    fetchFullyBooked();
  }, [productId]);

  // ================================
  // 🔥 GENERATE RESERVATION ID
  // ================================
  const generateReservationId = async () => {
    const counterRef = doc(db, "counters", "reservations");
    return await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      const lastId = counterSnap.exists() ? counterSnap.data().lastId : 0;
      const nextId = lastId + 1;

      transaction.set(counterRef, { lastId: nextId }, { merge: true });
      return `RES${String(nextId).padStart(5, "0")}`;
    });
  };

  // ================================
  // 🔥 SEND EMAIL
  // ================================
  const sendReservationEmail = async (
    email,
    name,
    appointmentDate,
    reservationId,
    productName
  ) => {
    try {
      await axios.post(`${BREVO_SERVER_URL}/send-email`, {
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
        `,
      });
    } catch (err) {
      console.error("Email failed:", err);
    }
  };

  // ================================
  // 🔥 BUILD PRODUCT DETAILS
  // ================================
  const buildProductDetails = (prod) => {
    if (!prod)
      return { productName: "Unknown Product", size: "", type: "" };

    const type =
      prod.type ||
      (prod.productId?.startsWith("MA-") ? "Mags" : "Tire") ||
      "";

    if (type.toLowerCase().includes("tire")) {
      const w = prod.tireWidth || prod.width || "";
      const ar = prod.aspectRatio || prod.aspect || "";
      const rim = prod.rimDiameter || prod.rim || "";
      const size =
        w && ar ? `${w}/${ar}R${rim || ""}`.replace(/R$/, "") : prod.size || "";
      return {
        productName:
          `${prod.brand || ""} ${prod.model || ""} ${size}`.trim() || "Tire",
        size,
        type: "Tire",
      };
    }

    if (type.toLowerCase().includes("mag")) {
      const w = prod.wheelWidth || "";
      const dia = prod.wheelDiameter || "";
      const size = w && dia ? `${w}x${dia}` : prod.size || "";
      return {
        productName:
          `${prod.brand || ""} ${prod.model || ""} ${size}`.trim() || "Mags",
        size,
        type: "Mags",
      };
    }

    return {
      productName:
        `${prod.brand || ""} ${prod.model || ""} ${prod.size || ""}`.trim() ||
        "Product",
      size: prod.size || "",
      type,
    };
  };

  // ================================
  // 🔥 SUBMIT RESERVATION
  // ================================
  const handleSubmit = async () => {
    if (!user) return alert("You must be logged in to reserve.");
    if (
      !vehicleBrand.trim() ||
      !vehicleModel.trim() ||
      !vehicleYear.trim() ||
      !plateNumber.trim() ||
      !preferredDate
    )
      return alert("Fill out all required fields.");
    if (!product) return alert("Product not found.");

    const chosenDate = new Date(preferredDate);
    chosenDate.setHours(0, 0, 0, 0);

    const chosenKey = chosenDate.toDateString();
    if (fullyBookedDates.includes(chosenKey))
      return alert("Date fully booked.");

    try {
      const reservationId = await generateReservationId();
      const { productName, size, type } = buildProductDetails(product);

      const reservationData = {
        id: reservationId,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || "Customer",
        productId: product.id,
        productName,
        brand: product.brand || "",
        model: product.model || "",
        size: size || "",
        type,
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
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "reservations", reservationId), reservationData);

      sendReservationEmail(
        user.email,
        user.displayName || "Customer",
        chosenDate.toLocaleDateString(),
        reservationId,
        productName
      );

      alert("Reservation submitted!");
      navigate(`/invoice/${reservationId}`, {
        state: { reservation: reservationData },
      });
    } catch (err) {
      console.error("Reservation submission error:", err);
      alert("Failed to reserve.");
    }
  };

  // ================================
  // 🔥 DISABLE DATES
  // ================================
  const tileDisabled = ({ date }) => {
    const now = new Date();
    const key = date.toDateString();
    if (date <= now) return true;
    if (fullyBookedDates.includes(key)) return true;
    return false;
  };

  // ================================
  // 🔥 RENDER
  // ================================
  if (loading || loadingDownpayment)
    return <div className="reservation-page">Loading...</div>;

  if (!product)
    return <div className="reservation-page">Product not found.</div>;

  const { productName: headerName } = buildProductDetails(product);

  return (
    <div className="reservation-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <h2>Reserve: {headerName}</h2>

      <div className="reservation-form">
        <label>Vehicle Info</label>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <input
            value={vehicleBrand}
            onChange={(e) => setVehicleBrand(e.target.value)}
            placeholder="Brand (e.g. Toyota)"
          />
          <input
            value={vehicleModel}
            onChange={(e) => setVehicleModel(e.target.value)}
            placeholder="Model (e.g. Vios)"
          />
          <input
            value={vehicleYear}
            onChange={(e) => setVehicleYear(e.target.value)}
            placeholder="Year (e.g. 2020)"
          />
        </div>

        <label>Plate Number</label>
        <input
          value={plateNumber}
          onChange={(e) => setPlateNumber(e.target.value)}
          placeholder="e.g. ABC 1234"
        />

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
          <p>
            <strong>Price:</strong> ₱{product.price}
          </p>
          <p>
            <strong>Downpayment:</strong> ₱{downpayment}
          </p>
        </div>

        <button className="submit-btn" onClick={handleSubmit}>
          Submit Reservation
        </button>
      </div>
    </div>
  );
};

export default ReservationPage;
