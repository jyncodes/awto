// src/components/Manual.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import vehicleData from "../../data/vehicleData"; // ✅ dataset
import "../../styles/Manual.css";

const Manual = () => {
  const navigate = useNavigate();

  // Selections
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [type, setType] = useState(""); // Tire or Wheel
  const [size, setSize] = useState("");

  // Handle Shop Now
  const handleShopNow = (e) => {
    e.preventDefault();
    if (!brand || !model || !type || !size) return;

    const selectedFitment =
      vehicleData[brand]?.[model]?.[type]?.find((s) => s.size === size);

    if (!selectedFitment) return;

    navigate("/user-dashboard", {
      state: {
        selectionType: "fitment",
        vehicleLabel: `${brand} ${model} - ${type} ${size}`,
        fitment: {
          type: type.toLowerCase(),
          size: selectedFitment.size,
          rimDiameter: selectedFitment.rimDiameter,
          width: selectedFitment.width,
          aspectRatio: selectedFitment.aspectRatio || null,
          boltPattern: selectedFitment.boltPattern || null,
          offset: selectedFitment.offset || null,
        },
      },
    });
  };

  // Reset selections
  const handleClear = () => {
    setBrand("");
    setModel("");
    setType("");
    setSize("");
  };

  // Preview selected fitment
  const selectedFitment =
    brand && model && type && size
      ? vehicleData[brand]?.[model]?.[type]?.find((s) => s.size === size)
      : null;

  return (
    <div className="fitment-container">
      <h1 className="fitment-title">Fitment Recommendation</h1>
      <form onSubmit={handleShopNow}>
        {/* Inline dropdowns */}
        <div className="fitment-row">
          {/* Brand */}
          <select
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              setModel("");
              setType("");
              setSize("");
            }}
          >
            <option value="">Select Brand</option>
            {Object.keys(vehicleData).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          {/* Model */}
          <select
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setType("");
              setSize("");
            }}
            disabled={!brand}
          >
            <option value="">Select Model</option>
            {brand &&
              Object.keys(vehicleData[brand]).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
          </select>

          {/* Type */}
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setSize("");
            }}
            disabled={!model}
          >
            <option value="">Select Type</option>
            {brand &&
              model &&
              Object.keys(vehicleData[brand][model]).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
          </select>

          {/* Size */}
          <select
            value={size}
            onChange={(e) => setSize(e.target.value)}
            disabled={!type}
          >
            <option value="">Select Size</option>
            {brand &&
              model &&
              type &&
              vehicleData[brand][model][type].map((s) => (
                <option key={s.size} value={s.size}>
                  {s.size}
                </option>
              ))}
          </select>

          {/* Buttons */}
          <button
            type="submit"
            disabled={!brand || !model || !type || !size}
            className="shop-now-btn"
          >
            Shop Now
          </button>
          <button type="button" onClick={handleClear} className="clear-btn">
            Clear
          </button>
        </div>
      </form>

      {/* Preview */}
      {selectedFitment && (
        <div className="fitment-preview">
          <h3>Selected Vehicle</h3>
          <p>
            {brand} {model} - {type} {size}
          </p>
          <h4>Fitment Specs</h4>
          <ul>
            <li>Rim Diameter: {selectedFitment.rimDiameter}</li>
            <li>Width: {selectedFitment.width}</li>
            {selectedFitment.aspectRatio && (
              <li>Aspect Ratio: {selectedFitment.aspectRatio}</li>
            )}
            {type === "Wheel" && (
              <>
                <li>Bolt Pattern: {selectedFitment.boltPattern}</li>
                <li>Offset: {selectedFitment.offset}</li>
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Manual;
