import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/user-styles/Manual.css";

const Manual = () => {
  const navigate = useNavigate();

  // Firestore data
  const [vehicleData, setVehicleData] = useState({});
  const [loading, setLoading] = useState(true);

  // Selection states
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [type, setType] = useState(""); // Tire or Wheel
  const [size, setSize] = useState("");

  // === Fetch vehicle fitments (based on Vehicles.jsx structure) ===
  useEffect(() => {
    const fetchData = async () => {
      try {
        const snapshot = await getDocs(collection(db, "vehicleFitment"));
        const data = {};
        snapshot.forEach((docSnap) => {
          const { brand, model, tireFitments = [], wheelFitments = [] } =
            docSnap.data();
          if (!brand || !model) return;
          if (!data[brand]) data[brand] = {};
          data[brand][model] = { tireFitments, wheelFitments };
        });
        setVehicleData(data);
      } catch (error) {
        console.error("❌ Error fetching vehicle fitments:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // === Reset selections ===
  const handleClear = () => {
    setBrand("");
    setModel("");
    setType("");
    setSize("");
  };

  // === Dropdown Options ===
  const brandOptions = Object.keys(vehicleData);
  const modelOptions = brand ? Object.keys(vehicleData[brand] || {}) : [];
  const typeOptions = ["Tire", "Wheel"];

  // === Size Options based on selected type ===
  const sizeOptions =
    brand && model && type && vehicleData[brand][model]
      ? (type === "Tire"
          ? vehicleData[brand][model].tireFitments.map((f) => {
              if (f.tireWidth && f.aspectRatio && f.rimDiameter) {
                return `${f.tireWidth}/${f.aspectRatio}R${f.rimDiameter}`;
              }
              return null;
            })
          : vehicleData[brand][model].wheelFitments.map((f) => {
              if (f.wheelDiameter && f.wheelWidth && f.boltPattern) {
                return `${f.wheelDiameter}x${f.wheelWidth} ${f.boltPattern}`;
              }
              return null;
            })
        ).filter(Boolean)
      : [];

  // === Get selected fitment details ===
  const selectedFitment =
    brand && model && type && size
      ? (type === "Tire"
          ? vehicleData[brand][model].tireFitments.find((f) => {
              const formatted = `${f.tireWidth}/${f.aspectRatio}R${f.rimDiameter}`;
              return formatted === size;
            })
          : vehicleData[brand][model].wheelFitments.find((f) => {
              const formatted = `${f.wheelDiameter}x${f.wheelWidth} ${f.boltPattern}`;
              return formatted === size;
            }))
      : null;

  // === Handle "Shop Now" navigation ===
  const handleShopNow = (e) => {
    e.preventDefault();

    if (!brand || !model || !type || !size) {
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
        vehicleLabel: `${brand} ${model} - ${type} ${size}`,
        fitment: {
          type: type.toLowerCase(),
          size: size,
          rimDiameter: selectedFitment.rimDiameter || selectedFitment.wheelDiameter || "",
          width: selectedFitment.wheelWidth || selectedFitment.tireWidth || "",
          boltPattern: selectedFitment.boltPattern || "",
          offset: selectedFitment.offset || "",
          centerBore: selectedFitment.centerBore || "",
        },
      },
    });
  };

  return (
    <div className="fitment-container">
      <h1 className="fitment-title">Manual Fitment Selector</h1>

      {loading ? (
        <p>Loading fitment data...</p>
      ) : (
        <form onSubmit={handleShopNow}>
          <div className="fitment-row">
            {/* Brand Dropdown */}
            <select value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">Select Brand</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>

            {/* Model Dropdown */}
            <select
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

            {/* Type Dropdown */}
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              disabled={!model}
            >
              <option value="">Select Type</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {/* Size Dropdown */}
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              disabled={!type}
            >
              <option value="">Select Size</option>
              {sizeOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {/* Buttons */}
            <button
              type="submit"
              className="shop-now-btn"
              disabled={!brand || !model || !type || !size}
            >
              Shop Now
            </button>

            <button type="button" className="clear-btn" onClick={handleClear}>
              Clear
            </button>
          </div>
        </form>
      )}

      {/* Fitment Preview */}
      {selectedFitment && (
        <div className="fitment-preview">
          <h3>Selected Vehicle</h3>
          <p>
            {brand} {model} — {type} {size}
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
                {selectedFitment.offset && (
                  <li>Offset: {selectedFitment.offset}</li>
                )}
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
