import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Manual.css";
import hondaData from "../../Data/HondaData"; // ✅ import dataset

const Manual = () => {
  const navigate = useNavigate();

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedTrim, setSelectedTrim] = useState("");
  const [trimDetails, setTrimDetails] = useState(null);

  const make = "Honda"; // fixed for now
  const years = Object.keys(hondaData);

  const models = selectedYear ? Object.keys(hondaData[selectedYear]) : [];
  const trims =
    selectedYear && selectedModel
      ? hondaData[selectedYear][selectedModel]
      : [];

  // Shop Now → passes fitment specs to user-dashboard
  const handleShopNow = () => {
    if (!trimDetails) return;

    const vehicleLabel = `${selectedYear} ${make} ${selectedModel} ${trimDetails.name}`;

    navigate("/user-dashboard", {
      state: {
        fitment: {
          boltPattern: trimDetails.boltPattern,
          offset: trimDetails.offset,
          wheelSize: trimDetails.wheelSize,
        },
        vehicleLabel,
      },
    });
  };

  // Clear
  const handleClear = () => {
    setSelectedYear("");
    setSelectedModel("");
    setSelectedTrim("");
    setTrimDetails(null);
  };

  return (
    <div className="fitment-container">
      <h1 className="fitment-title">Fitment Recommendation</h1>

      {/* Year */}
      <select
        value={selectedYear}
        onChange={(e) => {
          setSelectedYear(e.target.value);
          setSelectedModel("");
          setSelectedTrim("");
          setTrimDetails(null);
        }}
      >
        <option value="">Select Year</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      {/* Model */}
      <select
        value={selectedModel}
        onChange={(e) => {
          setSelectedModel(e.target.value);
          setSelectedTrim("");
          setTrimDetails(null);
        }}
        disabled={!models.length}
      >
        <option value="">Select Model</option>
        {models.map((model) => (
          <option key={model} value={model}>
            {model}
          </option>
        ))}
      </select>

      {/* Trim */}
      <div className="trim-shop-wrapper">
        <select
          value={selectedTrim}
          onChange={(e) => {
            setSelectedTrim(e.target.value);
            const selected = trims.find((t) => t.id === e.target.value);
            setTrimDetails(selected || null);
          }}
          disabled={!trims.length}
        >
          <option value="">Select Trim</option>
          {trims.map((trim) => (
            <option key={trim.id} value={trim.id}>
              {trim.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleShopNow}
          disabled={!selectedTrim}
          className="shop-now-btn"
        >
          Shop Now
        </button>

        <button onClick={handleClear} className="clear-btn">
          Clear
        </button>
      </div>

      {/* Specs */}
      {trimDetails && (
        <div className="trim-details">
          <h2>Recommended Specs</h2>
          <p><strong>Tire Size:</strong> {trimDetails.tireSize}</p>
          <p><strong>Wheel Size:</strong> {trimDetails.wheelSize}</p>
          <p><strong>Bolt Pattern:</strong> {trimDetails.boltPattern}</p>
          <p><strong>Offset:</strong> {trimDetails.offset}</p>
          <p><strong>Hub Bore:</strong> {trimDetails.hubBore}</p>
        </div>
      )}
    </div>
  );
};

export default Manual;
