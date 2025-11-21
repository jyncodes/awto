import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/user-styles/Manual.css";

const Manual = () => {
  const navigate = useNavigate();

  const [vehicleData, setVehicleData] = useState({});
  const [loading, setLoading] = useState(true);

  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState("");
  const [type, setType] = useState("");
  const [size, setSize] = useState("");

  // === 🔄 Real-time Firestore fetch ===
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "vehicleFitment"),
      (snapshot) => {
        const dataMap = {};

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          const {
            brand,
            model,
            year,
            tireFitments = [],
            wheelFitments = [],
          } = data;

          if (!brand || !model || !year) return;

          if (!dataMap[brand]) dataMap[brand] = {};
          if (!dataMap[brand][model]) dataMap[brand][model] = {};
          dataMap[brand][model][year] = {
            tireFitments: Array.isArray(tireFitments) ? tireFitments : [],
            wheelFitments: Array.isArray(wheelFitments) ? wheelFitments : [],
          };
        });

        setVehicleData(dataMap);
        setLoading(false);
      },
      (err) => {
        console.error("❌ Firestore Error:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // === Reset ===
  const handleClear = () => {
    setBrand("");
    setModel("");
    setYear("");
    setType("");
    setSize("");
  };

  // === Dropdown Options ===
  const brandOptions = Object.keys(vehicleData);
  const modelOptions = brand ? Object.keys(vehicleData[brand] || {}) : [];
  const yearOptions =
    brand && model ? Object.keys(vehicleData[brand][model] || {}) : [];
  const typeOptions = ["Tire", "Wheel"];

  // === Size Options ===
  const sizeOptions =
    brand && model && year && type
      ? (type === "Tire"
          ? vehicleData[brand][model][year]?.tireFitments.map((f, i) => {
              const label = `${f.tireWidth}/${f.aspectRatio}R${f.rimDiameter}`;
              return { id: `${label}-${i}`, label };
            })
          : vehicleData[brand][model][year]?.wheelFitments.map((f, i) => {
              // Include offset in the label for wheels
              const offsetLabel = f.offset ? ` Offset:${f.offset}` : "";
              const label = `${f.wheelDiameter}x${f.wheelWidth} ${f.boltPattern}${offsetLabel}`;
              return { id: `${label}-${i}`, label };
            })) || []
      : [];

  // === Selected Fitment ===
  const selectedFitment =
    brand && model && year && type && size
      ? (type === "Tire"
          ? vehicleData[brand][model][year]?.tireFitments.find((f) => {
              const formatted = `${f.tireWidth}/${f.aspectRatio}R${f.rimDiameter}`;
              return formatted === size;
            })
          : vehicleData[brand][model][year]?.wheelFitments.find((f) => {
              const offsetLabel = f.offset ? ` Offset:${f.offset}` : "";
              const formatted = `${f.wheelDiameter}x${f.wheelWidth} ${f.boltPattern}${offsetLabel}`;
              return formatted === size;
            }))
      : null;

  // === Shop Now ===
  const handleShopNow = (e) => {
    e.preventDefault();

    if (!brand || !model || !year || !type || !size) {
      alert("⚠️ Please select all fields before proceeding.");
      return;
    }

    if (!selectedFitment) {
      alert("❌ No fitment data found for this selection.");
      return;
    }

    navigate("/user-dashboard", {
      state: {
        selectionType: "fitment",
        vehicleLabel: `${brand} ${model} (${year}) - ${type} ${size}`,
        fitment: {
          type: type.toLowerCase(),
          size,
          rimDiameter:
            selectedFitment.rimDiameter || selectedFitment.wheelDiameter || "",
          width: selectedFitment.wheelWidth || selectedFitment.tireWidth || "",
          boltPattern: selectedFitment.boltPattern || "",
          offset: selectedFitment.offset || "",
          centerBore: selectedFitment.centerBore || "",
        },
      },
    });
  };

  return (
    <div className="fitment-container premium-fitment">
      <h1 className="fitment-title">Manual Fitment Selector</h1>

      {loading ? (
        <p className="loading-text">Loading fitment data...</p>
      ) : (
        <form onSubmit={handleShopNow} className="fitment-form">
          <div className="fitment-row premium-row">

            {/* Brand */}
            <select
              className="fitment-select"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            >
              <option value="">Select Brand</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Model */}
            <select
              className="fitment-select"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={!brand}
            >
              <option value="">Select Model</option>
              {modelOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Year */}
            <select
              className="fitment-select"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              disabled={!model}
            >
              <option value="">Select Year</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>

            {/* Type */}
            <select
              className="fitment-select"
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={!year}
            >
              <option value="">Select Type</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Size */}
            <select
              className="fitment-select"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              disabled={!type}
            >
              <option value="">Select Size</option>
              {sizeOptions.map((s) => (
                <option key={s.id} value={s.label}>
                  {s.label}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="shop-now-btn premium-btn"
              disabled={!brand || !model || !year || !type || !size}
            >
              Shop Now
            </button>

            <button
              type="button"
              className="clear-btn premium-clear"
              onClick={handleClear}
            >
              Clear
            </button>
          </div>
        </form>
      )}

      {selectedFitment && (
        <div className="fitment-preview premium-preview">
          <h3>Selected Vehicle</h3>
          <p className="vehicle-label">
            {brand} {model} ({year}) — {type} {size}
          </p>

          <h4>Fitment Details</h4>
          <ul>
            {type === "Tire" ? (
              <>
                {selectedFitment.tireWidth && (
                  <li>Tire Width: {selectedFitment.tireWidth}</li>
                )}
                {selectedFitment.aspectRatio && (
                  <li>Aspect Ratio: {selectedFitment.aspectRatio}</li>
                )}
                {selectedFitment.rimDiameter && (
                  <li>Rim Diameter: {selectedFitment.rimDiameter}</li>
                )}
              </>
            ) : (
              <>
                {selectedFitment.wheelDiameter && (
                  <li>Wheel Diameter: {selectedFitment.wheelDiameter}</li>
                )}
                {selectedFitment.wheelWidth && (
                  <li>Wheel Width: {selectedFitment.wheelWidth}</li>
                )}
                {selectedFitment.boltPattern && (
                  <li>Bolt Pattern: {selectedFitment.boltPattern}</li>
                )}
                {selectedFitment.offset && <li>Offset: {selectedFitment.offset}</li>}
                {selectedFitment.centerBore && (
                  <li>Center Bore: {selectedFitment.centerBore}</li>
                )}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Manual;
