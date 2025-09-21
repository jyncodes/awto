import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/Manual.css";

// Example manual dataset (you can expand this)
const manualData = {
  Honda: {
    2020: {
      Civic: [
        {
          id: "civic-2020-lx",
          name: "LX",
          tireSize: "215/55R16",
          wheelSize: "16x7",
          boltPattern: "5x114.3",
          offset: "45mm",
          hubBore: "64.1mm",
        },
        {
          id: "civic-2020-ex",
          name: "EX",
          tireSize: "215/50R17",
          wheelSize: "17x7",
          boltPattern: "5x114.3",
          offset: "45mm",
          hubBore: "64.1mm",
        },
      ],
      Accord: [
        {
          id: "accord-2020-lx",
          name: "LX",
          tireSize: "225/50R17",
          wheelSize: "17x7.5",
          boltPattern: "5x114.3",
          offset: "50mm",
          hubBore: "64.1mm",
        },
      ],
    },
    2021: {
      Civic: [
        {
          id: "civic-2021-sport",
          name: "Sport",
          tireSize: "235/40R18",
          wheelSize: "18x8",
          boltPattern: "5x114.3",
          offset: "45mm",
          hubBore: "64.1mm",
        },
      ],
    },
  },
};

const Manual = () => {
  const navigate = useNavigate();

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedTrim, setSelectedTrim] = useState("");
  const [trimDetails, setTrimDetails] = useState(null);

  const make = "Honda"; // since we’re only focusing on Honda
  const years = Object.keys(manualData[make]);

  const models = selectedYear ? Object.keys(manualData[make][selectedYear]) : [];
  const trims =
    selectedYear && selectedModel
      ? manualData[make][selectedYear][selectedModel]
      : [];

  // Handle Shop Now click
  const handleShopNow = () => {
    if (!trimDetails) return;

    const vehicleLabel = `${selectedYear} ${make} ${selectedModel} ${trimDetails.name}`;

    navigate("/user-dashboard", {
      state: {
        size: [trimDetails.tireSize],
        vehicleLabel,
      },
    });
  };

  // Handle Clear click
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

      {/* Trim + Buttons */}
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

      {/* Recommended Specs */}
      {trimDetails && (
        <div className="trim-details">
          <h2>Recommended Specs</h2>
          <p>
            <strong>Tire Size:</strong> {trimDetails.tireSize}
          </p>
          <p>
            <strong>Wheel Size:</strong> {trimDetails.wheelSize}
          </p>
          <p>
            <strong>Bolt Pattern:</strong> {trimDetails.boltPattern}
          </p>
          <p>
            <strong>Offset:</strong> {trimDetails.offset}
          </p>
          <p>
            <strong>Hub Bore:</strong> {trimDetails.hubBore}
          </p>
        </div>
      )}
    </div>
  );
};

export default Manual;
