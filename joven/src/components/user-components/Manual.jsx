
  import React, { useState, useEffect } from "react";
  import { useNavigate } from "react-router-dom";
  import { collection, onSnapshot } from "firebase/firestore";
  import { db, auth } from "../../firebase";
  import { onAuthStateChanged } from "firebase/auth";
  import "../../styles/user-styles/Manual.css";

  const Manual = ({ fitmentState, onClearFitment }) => {

    const navigate = useNavigate();

    const [vehicleData, setVehicleData] = useState({});
    const [loading, setLoading] = useState(true);

    const [brand, setBrand] = useState("");
    const [model, setModel] = useState("");
    const [year, setYear] = useState("");
    const [type, setType] = useState("");
    const [size, setSize] = useState("");

    const [currentUser, setCurrentUser] = useState(null);

    useEffect(() => {
      const unlisten = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
      });
      return () => unlisten();
    }, []);

    useEffect(() => {
  if (!fitmentState) {
    setBrand("");
    setModel("");
    setYear("");
    setType("");
    setSize("");
  }
}, [fitmentState]);


    useEffect(() => {
      const unsubscribe = onSnapshot(
        collection(db, "vehicleFitment"),
        (snapshot) => {
          const dataMap = {};

          snapshot.forEach((docSnap) => {
  const { brand, model, years = {} } = docSnap.data();
  if (!brand || !model) return;

  if (!dataMap[brand]) dataMap[brand] = {};
  if (!dataMap[brand][model]) dataMap[brand][model] = {};

  Object.entries(years).forEach(([year, fitment]) => {
    if (!dataMap[brand][model][year]) {
      dataMap[brand][model][year] = {
        tireFitments: [],
        wheelFitments: [],
      };
    }

    dataMap[brand][model][year].tireFitments.push(
      ...(fitment.tireFitments || [])
    );
    dataMap[brand][model][year].wheelFitments.push(
      ...(fitment.wheelFitments || [])
    );
  });
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

    // ⭐ FIXED — Clear button now stays on the same page
const handleClear = () => {
  setBrand("");
  setModel("");
  setYear("");
  setType("");
  setSize("");

  onClearFitment?.(); 
};

    const brandOptions = Object.keys(vehicleData);
    const modelOptions = brand ? Object.keys(vehicleData[brand] || {}) : [];
    const yearOptions =
    brand && model
      ? Object.keys(vehicleData[brand][model] || {}).filter(Boolean)
      : [];
    const typeOptions = ["Tire", "Mags"];

  const sizeOptions =
    brand && model && year && type
      ? type === "Tire"
        ? vehicleData[brand][model][year]?.tireFitments.map((f, i) => ({
            id: `${f.tireWidth}/${f.aspectRatio}R${f.rimDiameter}-${i}`,
            label: `${f.tireWidth}/${f.aspectRatio}R${f.rimDiameter}`,
            fitment: f,
          }))
        : vehicleData[brand][model][year]?.wheelFitments.map((f, i) => ({
            id: `${f.wheelDiameter}x${f.wheelWidth}-${i}`,
            label: `${f.wheelDiameter}x${f.wheelWidth} ${f.boltPattern}`,
            fitment: f,
          }))
      : [];

    const selectedFitmentObj = sizeOptions.find((s) => s.label === size);
    const selectedFitment = selectedFitmentObj?.fitment || null;

    const handleShopNow = (e) => {
      e.preventDefault();

      if (!currentUser) {
        window.dispatchEvent(new Event("open-login"));
        return;
      }

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
          vehicleLabel: `${brand} ${model} ${year} - ${type} ${size}`,
          year,
          size,
          fitment: {
            type: type.toLowerCase(),
            size,
            rimDiameter:
              selectedFitment.rimDiameter ||
              selectedFitment.wheelDiameter ||
              "",
            width: selectedFitment.wheelWidth || selectedFitment.tireWidth || "",
            boltPattern: selectedFitment.boltPattern || "",
            tireWidth: selectedFitment.tireWidth || "",
            aspectRatio: selectedFitment.aspectRatio || "",
          },
        },
      });
    };

    return (
      <div className="fitment-container premium-fitment">
        <h1 className="fitment-title">Find the Right Fit for Your Vehicle</h1>

        {loading ? (
          <p className="loading-text">Loading fitment data...</p>
        ) : (
          <form onSubmit={handleShopNow} className="fitment-form">
            <div className="fitment-row premium-row">
              <select
                className="fitment-select"
                value={brand}
                onChange={(e) => {
                  setBrand(e.target.value);
                  setModel("");
                  setYear("");
                  setType("");
                  setSize("");
                }}
              >
                <option value="">Select Brand</option>
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>

              <select
                className="fitment-select"
                value={model}
                onChange={(e) => {
                setModel(e.target.value);
                setYear("");
                setType("");
                setSize("");
              }}
                disabled={!brand}
              >
                <option value="">Select Model</option>
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                className="fitment-select"
                value={year}
                onChange={(e) => {
                  setYear(e.target.value);
                  setType("");
                  setSize("");
                }}
                disabled={!model}
              >
                <option value="">Select Year</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <select
                className="fitment-select"
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
                disabled={!brand || !model || !type || !size}
              >
                Find Matches
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
                    <span className="vehicle-label-value">
                    {brand} {model} {year} | {type} {size}
                  </span>
            </p>

          </div>
        )}
      </div>
    );
  };

  export default Manual;