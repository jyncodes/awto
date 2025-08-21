// src/components/Fitment.jsx

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchYears,
  fetchMakes,
  fetchModels,
  fetchTrims,
  fetchTrimDetails,
} from "../hooks/useFitment";
import "../styles/Fitment.css";

const Fitment = () => {
  const navigate = useNavigate();

  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [trims, setTrims] = useState([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedTrim, setSelectedTrim] = useState("");

  const [trimDetails, setTrimDetails] = useState(null);

  // Fetch years
  useEffect(() => {
    const loadYears = async () => {
      const y = await fetchYears();
      setYears(y);
    };
    loadYears();
  }, []);

  // Fetch makes
  useEffect(() => {
    if (!selectedYear) return;
    const loadMakes = async () => {
      const m = await fetchMakes(selectedYear);
      setMakes(m);
    };
    loadMakes();
    setSelectedMake("");
    setSelectedModel("");
    setSelectedTrim("");
    setModels([]);
    setTrims([]);
    setTrimDetails(null);
  }, [selectedYear]);

  // Fetch models
  useEffect(() => {
    if (!selectedYear || !selectedMake) return;
    const loadModels = async () => {
      const m = await fetchModels(selectedYear, selectedMake);
      setModels(m);
    };
    loadModels();
    setSelectedModel("");
    setSelectedTrim("");
    setTrims([]);
    setTrimDetails(null);
  }, [selectedMake]);

  // Fetch trims
  useEffect(() => {
    if (!selectedYear || !selectedMake || !selectedModel) return;
    const loadTrims = async () => {
      const t = await fetchTrims(selectedYear, selectedMake, selectedModel);
      setTrims(t);
    };
    loadTrims();
    setSelectedTrim("");
    setTrimDetails(null);
  }, [selectedModel]);

  // Fetch trim details
  useEffect(() => {
    if (!selectedTrim) return;
    const loadTrimDetails = async () => {
      const d = await fetchTrimDetails(selectedTrim);
      setTrimDetails(d);
    };
    loadTrimDetails();
  }, [selectedTrim]);

  // Handle Shop Now click
  const handleShopNow = () => {
    if (!trimDetails) return;

    const makeName = makes.find((m) => m.slug === selectedMake)?.name || selectedMake;
    const modelName = models.find((m) => m.slug === selectedModel)?.name || selectedModel;
    const trimName = trims.find((t) => t.id === selectedTrim)?.name || selectedTrim;

    const vehicleLabel = `${selectedYear} ${makeName} ${modelName} ${trimName}`;

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
    setSelectedMake("");
    setSelectedModel("");
    setSelectedTrim("");
    setMakes([]);
    setModels([]);
    setTrims([]);
    setTrimDetails(null);
  };

  return (
    <div className="fitment-container">
      <h1 className="fitment-title">Fitment Recommendation</h1>

      {/* Year */}
      <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
        <option value="">Select Year</option>
        {years.map((year) => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>

      {/* Make */}
      <select
        value={selectedMake}
        onChange={(e) => setSelectedMake(e.target.value)}
        disabled={!makes.length}
      >
        <option value="">Select Make</option>
        {makes.map((make) => (
          <option key={make.slug} value={make.slug}>{make.name}</option>
        ))}
      </select>

      {/* Model */}
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        disabled={!models.length}
      >
        <option value="">Select Model</option>
        {models.map((model) => (
          <option key={model.slug} value={model.slug}>{model.name}</option>
        ))}
      </select>

      {/* Trim + Buttons */}
      <div className="trim-shop-wrapper">
        <select
          value={selectedTrim}
          onChange={(e) => setSelectedTrim(e.target.value)}
          disabled={!trims.length}
        >
          <option value="">Select Trim</option>
          {trims.map((trim) => (
            <option key={trim.id} value={trim.id}>{trim.name}</option>
          ))}
        </select>

        <button
          onClick={handleShopNow}
          disabled={!selectedTrim}
          className="shop-now-btn"
        >
          Shop Now
        </button>

        <button
          onClick={handleClear}
          className="clear-btn"
        >
          Clear
        </button>
      </div>

      {/* Recommended Specs */}
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

export default Fitment;
