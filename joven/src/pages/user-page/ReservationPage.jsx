// src/pages/user-page/ReservationPage.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { db, auth } from "../../firebase";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../../styles/user-styles/ReservationPage.css";

import Navbar from "../../components/Navbar";

const ReservationPage = () => {
  const { productId } = useParams();
  const location = useLocation();
  const passedVehicle = location.state?.vehicleLabel || null;

  const navigate = useNavigate();

  const passedProduct = location.state?.product || null;
  const selectedSize = location.state?.selectedSize || null;
  const selectedDocId = location.state?.selectedDocId || null;
  const pricePerItem =
    location.state?.pricePerItem ?? (passedProduct?.price ?? 0);
  const quantity = location.state?.quantity || 1;

  const [product, setProduct] = useState(passedProduct);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!passedProduct);

  const [vehicleBrand, setVehicleBrand] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYear, setVehicleYear] = useState("");
  const [vehicleYearError, setVehicleYearError] = useState("");

  const [plateNumber, setPlateNumber] = useState("");
  const [plateError, setPlateError] = useState("");

  const [preferredDate, setPreferredDate] = useState(null);
  const [fullyBookedDates, setFullyBookedDates] = useState([]);
  const [note, setNote] = useState("");

  const [downpayment, setDownpayment] = useState(0);
  const [loadingDownpayment, setLoadingDownpayment] = useState(true);

  const MAX_BOOKINGS_PER_DATE = 3;

  // ================= LOAD DOWNPAYMENT =================
  useEffect(() => {
    const loadDownpayment = async () => {
      try {
        const paymentsRef = doc(db, "settings", "payments");
        const snap = await getDoc(paymentsRef);
        setDownpayment(snap.exists() ? snap.data().downpayment : 0);
      } catch {
        setDownpayment(0);
      } finally {
        setLoadingDownpayment(false);
      }
    };
    loadDownpayment();
  }, []);

  // ================= AUTO-FILL VEHICLE INFO =================
  useEffect(() => {
    if (typeof passedVehicle === "string") {
      const [brandModel] = passedVehicle.split(" - ");
      if (brandModel) {
        const parts = brandModel.trim().split(" ");
        setVehicleBrand(parts[0] || "");
        setVehicleModel(parts.slice(1).join(" ") || "");
      }
    }
  }, [passedVehicle]);

  // ================= LOAD USER =================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // ================= LOAD PRODUCT =================
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
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, passedProduct]);

  // ================= FULLY BOOKED DATES =================
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

  // ================= CONTINUE TO PAYMENT =================
  const handleProceedToPayment = () => {
    if (!user) return alert("You must be logged in to reserve.");

    if (
      !vehicleBrand.trim() ||
      !vehicleModel.trim() ||
      !vehicleYear.trim() ||
      !plateNumber.trim() ||
      !preferredDate
    )
      return alert("Fill out all required fields.");

    if (vehicleYearError || plateError)
      return alert("Fix validation errors first.");

    const chosenDate = new Date(preferredDate);
    chosenDate.setHours(0, 0, 0, 0);

    const chosenKey = chosenDate.toDateString();
    if (fullyBookedDates.includes(chosenKey))
      return alert("Date is fully booked.");

    const draftData = {
      product,
      selectedSize,
      selectedDocId,
      pricePerItem,
      quantity,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      plateNumber,
      preferredDate: chosenDate.toISOString(),
      note,
      downpayment,
    };

    localStorage.setItem("reservationDraft", JSON.stringify(draftData));

    navigate("/payment");
  };

  // ================= DISABLE DATES =================
  const tileDisabled = ({ date }) => {
    const now = new Date();
    const key = date.toDateString();
    return date <= now || fullyBookedDates.includes(key);
  };

  if (loading || loadingDownpayment)
    return <div className="reservation-page">Loading...</div>;

  if (!product)
    return <div className="reservation-page">Product not found.</div>;

  return (
    <div className="reservation-page-wrapper">
      <Navbar />

      <div className="reservation-page">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <h2>Reserve: {product?.brand} {product?.model}</h2>

        <div className="reservation-form">
          {/* --- FORM FIELDS REMAIN SAME --- */}

          <label>Vehicle Info</label>
          <div className="vehicle-row">
            <input
              value={vehicleBrand}
              onChange={(e) => setVehicleBrand(e.target.value)}
              placeholder="Brand"
              disabled={!!passedVehicle}
              className={passedVehicle ? "disabled-input" : ""}
            />
            <input
              value={vehicleModel}
              onChange={(e) => setVehicleModel(e.target.value)}
              placeholder="Model"
              disabled={!!passedVehicle}
              className={passedVehicle ? "disabled-input" : ""}
            />
            <input
              value={vehicleYear}
              onChange={(e) => {
                let year = e.target.value.replace(/\D/g, "");
                if (year.length > 4) year = year.slice(0, 4);
                setVehicleYear(year);

                if (year && (year < 2000 || year > 2026)) {
                  setVehicleYearError("Year must be between 2000 and 2026");
                } else {
                  setVehicleYearError("");
                }
              }}
              placeholder="Year (2000–2026)"
              className={vehicleYearError ? "invalid" : ""}
            />
          </div>

          {vehicleYearError && (
            <span className="plate-error">{vehicleYearError}</span>
          )}

          <div className="plate-number-container">
            <label className="plate-label">Plate Number</label>

            <input
              className={`plate-input ${plateError ? "invalid" : ""}`}
              value={plateNumber}
              onChange={(e) => {
                let value = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "");
                if (value.length > 7) value = value.slice(0, 7);
                setPlateNumber(value);

                const newPlate = /^[A-Z]{3}[0-9]{3,4}$/;
                setPlateError(
                  !newPlate.test(value) && value !== ""
                    ? "Invalid plate number (Format: AAA123 or AAA1234)"
                    : ""
                );
              }}
              placeholder="AAA123 or AAA1234"
            />

            {plateError && <span className="plate-error">{plateError}</span>}
          </div>

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
            <p><strong>Price per Item:</strong> ₱{pricePerItem.toLocaleString()}</p>
            <p><strong>Quantity:</strong> {quantity}</p>
            <p><strong>Total Price:</strong> ₱{(pricePerItem * quantity).toLocaleString()}</p>
            <p><strong>Downpayment:</strong> ₱{downpayment}</p>
          </div>

          <button className="submit-btn" onClick={handleProceedToPayment}>
            Continue to Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReservationPage;
