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

  const passedProduct = location.state?.product || null;


  const multipleItems = location.state?.items || [];
const isMultipleProducts = location.state?.type === "multiple-products";

const [closedDates, setClosedDates] = useState([]);

// ===== PRE-ASSESSMENT IMAGE =====
const [preAssessmentImage, setPreAssessmentImage] = useState(null);
const [imagePreview, setImagePreview] = useState(null);



const MAX_BOOKINGS_PER_DATE = 5; // reservation slots



  // ===== SERVICE MODE DETECTION =====
  const serviceType = location.state?.type || null;
  const selectedServices = location.state?.selectedServices || [];
  const totalServicePrice = location.state?.totalServicePrice || 0;

  const isServiceReservation = serviceType === "service";

  const passedVehicle = location.state?.vehicleLabel || null;
  const passedYear = location.state?.year || "";


  const navigate = useNavigate();

  // ===== PRODUCT RESERVATION DATA =====
  const products = isMultipleProducts
  ? multipleItems
  : passedProduct
  ? [passedProduct]
  : [];

  const selectedSize = location.state?.selectedSize || null;
  const selectedDocId = location.state?.selectedDocId || null;
  const pricePerItem =
    location.state?.pricePerItem ?? (passedProduct?.price ?? 0);
  const quantity = location.state?.quantity || 1;

  const [product, setProduct] = useState(passedProduct);
  const [user, setUser] = useState(null);
 const [loading, setLoading] = useState(
        !isMultipleProducts && !passedProduct
      );


  // ===== VEHICLE FIELDS =====
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
  if (!passedVehicle) return;

  // Example: "Toyota Hilux 2021 - Tire 265/65R17"
  const [vehiclePart] = passedVehicle.split(" | ");


  if (!vehiclePart) return;

  const parts = vehiclePart.trim().split(" ");

  // Last part is year
  const extractedYear = parts[parts.length - 1];

  // Remaining parts = brand + model
  const brand = parts[0];
  const model = parts.slice(1, -1).join(" ");

  setVehicleBrand(brand || "");
  setVehicleModel(model || "");
  setVehicleYear(passedYear || extractedYear || "");
}, [passedVehicle, passedYear]);


  // ================= LOAD USER =================
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  // ================= LOAD PRODUCT ONLY IF NOT SERVICE =================
  useEffect(() => {
    if (isServiceReservation) {
      setLoading(false);
      return;
    }

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
  }, [productId, passedProduct, isServiceReservation]);

  // ================= FULLY BOOKED DATES =================
  useEffect(() => {
  const fetchFullyBooked = async () => {
    try {
      const q = query(
        collection(db, "reservations"),
        where("isCancelled", "==", false)
      );

      const snapshot = await getDocs(q);

      const dateCounts = {};

      snapshot.forEach((docSnap) => {
        const ts = docSnap.data().preferredDate;
        if (!ts) return;

        const dateObj =
          ts instanceof Timestamp ? ts.toDate() : new Date(ts);

        dateObj.setHours(0, 0, 0, 0);
        const key = dateObj.toDateString();

        dateCounts[key] = (dateCounts[key] || 0) + 1;
      });

      const blocked = Object.keys(dateCounts).filter(
        (d) => dateCounts[d] >= MAX_BOOKINGS_PER_DATE
      );

      setFullyBookedDates(blocked);
    } catch (err) {
      console.error("Error fetching fully booked dates:", err);
    }
  };

  fetchFullyBooked();
}, []);

 // ================= CLOSED DATES (ADMIN) =================
useEffect(() => {
  const fetchClosedDates = async () => {
    try {
      const snapshot = await getDocs(collection(db, "closed_dates"));
      const closed = [];

      snapshot.forEach((docSnap) => {
        const ts = docSnap.data().date;
        if (!ts) return;

        const d =
          ts instanceof Timestamp ? ts.toDate() : new Date(ts);

        d.setHours(0, 0, 0, 0);
        closed.push(d.toDateString());
      });

      setClosedDates(closed);
    } catch (err) {
      console.error("Error fetching closed dates:", err);
    }
  };

  fetchClosedDates();
}, []);

const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file); // 👈 converts to Base64
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

const handleImageUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // Optional validation
  if (!file.type.startsWith("image/")) {
    alert("Please upload an image file");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    alert("Image must be less than 5MB");
    return;
  }

  try {
    const base64 = await convertToBase64(file);
    setPreAssessmentImage(base64);
    setImagePreview(base64);
  } catch (err) {
    console.error("Image conversion failed:", err);
  }
};



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

    let draftData;

    if (isServiceReservation) {
      draftData = {
        type: "service",
        selectedServices,
        totalServicePrice,
        vehicleBrand,
        vehicleModel,
        vehicleYear,
        plateNumber,
        preferredDate: chosenDate.toISOString(),
        note,
        downpayment,
      };
    } else {
      draftData = isMultipleProducts
  ? {
      type: "multiple-products",
      items: products,
      vehicleBrand,
      vehicleModel,
      vehicleYear,
      plateNumber,
      preferredDate: chosenDate.toISOString(),
      note,
      downpayment,
    }
  : {
      type: "product",
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

    }

    localStorage.setItem("reservationDraft", JSON.stringify(draftData));
    navigate("/payment");
  };

  // ================= DISABLE DATES =================
    const tileDisabled = ({ date }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const d = new Date(date);
      d.setHours(0, 0, 0, 0);

      const key = d.toDateString();

      return (
            d < today ||
            fullyBookedDates.includes(key) ||
            closedDates.includes(key)
          );

    };


  if (loading || loadingDownpayment)
    return <div className="reservation-page">Loading...</div>;

  if (!product && !isServiceReservation)
    return <div className="reservation-page">Product not found.</div>;

  return (
    <div className="reservation-page-wrapper">
      <Navbar />

      <div className="reservation-page">
        <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>

        <h2>
          {isServiceReservation
            ? "Reserve Selected Services"
            : isMultipleProducts
              ? `Reserve ${products.length} Selected Products`
              : `Reserve: ${product?.brand} ${product?.model}`}
        </h2>

        <div className="reservation-form">
          {/* VEHICLE INFO */}
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
              disabled={!!passedVehicle}        // 👈 ADD THIS
              className={`${vehicleYearError ? "invalid" : ""} ${passedVehicle ? "disabled-input" : ""}`}
            />

          </div>

          {vehicleYearError && (
            <span className="plate-error">{vehicleYearError}</span>
          )}

          {/* PLATE NUMBER */}
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

          {/* PRE-ASSESSMENT IMAGE */}
          <label>Vehicle Pre-Assessment Photo (Optional)</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
          />

          {imagePreview && (
            <div className="image-preview">
              <img
                src={imagePreview}
                alt="Pre-assessment preview"
                style={{ maxWidth: "100%", marginTop: "10px", borderRadius: "8px" }}
              />
            </div>
          )}


          {/* DATE PICKER */}
          <label>Preferred Date</label>
          <Calendar
            onChange={setPreferredDate}
            value={preferredDate}
            minDate={new Date()}
            tileDisabled={tileDisabled}
          />

          {/* NOTES */}
          <label>Additional Notes</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Request or instruction..."
          />

          {/* PRICE SUMMARY */}
<div className="price-summary">
  {isServiceReservation ? (
    <>
      <p><strong>Selected Services:</strong></p>
      <ul>
        {selectedServices.map((svc, index) => (
          <li key={index}>
            {svc.name} — ₱{svc.price.toLocaleString()}
          </li>
        ))}
      </ul>

      <p><strong>Total Service Price:</strong> ₱{totalServicePrice.toLocaleString()}</p>
      <p><strong>Downpayment:</strong> ₱{downpayment}</p>
    </>
  ) : isMultipleProducts ? (
    <>
      <p><strong>Selected Products:</strong></p>
      <ul>
        {products.map((item, idx) => (
          <li key={idx}>
            {item.productName} — ₱
            {(item.totalPrice ?? item.pricePerItem * item.quantity).toLocaleString()}
          </li>
        ))}
      </ul>

      <p>
        <strong>Total Price:</strong> ₱
        {products.reduce(
          (sum, item) =>
            sum + (item.totalPrice ?? item.pricePerItem * item.quantity),
          0
        ).toLocaleString()}
      </p>

      <p><strong>Downpayment:</strong> ₱{downpayment}</p>
    </>
  ) : (
    <>
      <p><strong>Price per Item:</strong> ₱{pricePerItem.toLocaleString()}</p>
      <p><strong>Quantity:</strong> {quantity}</p>
      <p>
        <strong>Total Price:</strong> ₱
        {(pricePerItem * quantity).toLocaleString()}
      </p>
      <p><strong>Downpayment:</strong> ₱{downpayment}</p>
    </>
  )}
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
