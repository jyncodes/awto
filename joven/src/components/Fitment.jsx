// Fitment.jsx
import React, { useState, useEffect } from "react";
import {
  fetchYears,
  fetchMakes,
  fetchModels,
  fetchTrims,
  fetchTrimDetails,
} from "../hooks/useFitment";

const Fitment = () => {
  const [years, setYears] = useState([]);
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [trims, setTrims] = useState([]);

  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedTrim, setSelectedTrim] = useState("");

  const [trimDetails, setTrimDetails] = useState(null);

  // Load Years on mount
  useEffect(() => {
    const loadYears = async () => {
      const y = await fetchYears();
      setYears(y);
      console.log("Years:", y);
    };
    loadYears();
  }, []);

  // Load Makes when Year changes
  useEffect(() => {
    if (!selectedYear) return;
    const loadMakes = async () => {
      const m = await fetchMakes(selectedYear);
      setMakes(m);
      console.log("Makes:", m);
    };
    loadMakes();
    setSelectedMake("");
    setSelectedModel("");
    setSelectedTrim("");
    setModels([]);
    setTrims([]);
    setTrimDetails(null);
  }, [selectedYear]);

  // Load Models when Make changes
  useEffect(() => {
    if (!selectedYear || !selectedMake) return;
    const loadModels = async () => {
      const m = await fetchModels(selectedYear, selectedMake);
      setModels(m);
      console.log("Models:", m);
    };
    loadModels();
    setSelectedModel("");
    setSelectedTrim("");
    setTrims([]);
    setTrimDetails(null);
  }, [selectedMake]);

  // Load Trims when Model changes
  useEffect(() => {
    if (!selectedYear || !selectedMake || !selectedModel) return;
    const loadTrims = async () => {
      const t = await fetchTrims(selectedYear, selectedMake, selectedModel);
      setTrims(t);
      console.log("Trims:", t);
    };
    loadTrims();
    setSelectedTrim("");
    setTrimDetails(null);
  }, [selectedModel]);

  // Load Trim Details when Trim selected
  useEffect(() => {
    if (!selectedTrim) return;
    const loadTrimDetails = async () => {
      const d = await fetchTrimDetails(selectedTrim);
      setTrimDetails(d);
      console.log("Trim Details:", d);
    };
    loadTrimDetails();
  }, [selectedTrim]);

  return (
    <div className="p-6 max-w-xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold mb-2">Fitment Recommendation</h1>

      <select
        className="w-full p-2 border rounded"
        value={selectedYear}
        onChange={(e) => setSelectedYear(e.target.value)}
      >
        <option value="">Select Year</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>

      <select
        className="w-full p-2 border rounded"
        value={selectedMake}
        onChange={(e) => setSelectedMake(e.target.value)}
        disabled={!makes.length}
      >
        <option value="">Select Make</option>
        {makes.map((make) => (
          <option key={make.slug} value={make.slug}>
            {make.name}
          </option>
        ))}
      </select>

      <select
        className="w-full p-2 border rounded"
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        disabled={!models.length}
      >
        <option value="">Select Model</option>
        {models.map((model) => (
          <option key={model.slug} value={model.slug}>
            {model.name}
          </option>
        ))}
      </select>

      <select
        className="w-full p-2 border rounded"
        value={selectedTrim}
        onChange={(e) => setSelectedTrim(e.target.value)}
        disabled={!trims.length}
      >
        <option value="">Select Trim</option>
        {trims.map((trim) => (
          <option key={trim.id} value={trim.id}>
            {trim.name}
          </option>
        ))}
      </select>

      {trimDetails && (
        <div className="mt-4 border p-4 rounded bg-gray-50">
          <h2 className="text-lg font-medium">Recommended Specs</h2>
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
