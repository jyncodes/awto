import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/admin-styles/Vehicles.css";

const Vehicles = () => {
  const [vehicleData, setVehicleData] = useState({});
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    brand: "",
    model: "",
    type: "",
    fitments: [],
  });

  const [fitmentFields, setFitmentFields] = useState({
    size: "",
    wheelDiameter: "",
    wheelWidth: "",
    boltPattern: "",
    offset: "",
    centerBore: "",
  });

  // --- Fetch existing data from Firestore ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "vehicleFitment"));
        const data = {};

        querySnapshot.forEach((doc) => {
          const { brand, model, type, fitments } = doc.data();
          if (!data[brand]) data[brand] = {};
          if (!data[brand][model]) data[brand][model] = {};
          data[brand][model][type] = fitments || [];
        });

        setVehicleData(data);
      } catch (error) {
        console.error("Error fetching fitment data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- Upload to Firestore ---
  const handleUpload = async (e) => {
    e.preventDefault();

    // Auto-add the last input if filled
    let updatedFitments = [...form.fitments];
    const hasUnadded = Object.values(fitmentFields).some(
      (val) => val.trim() !== ""
    );
    if (hasUnadded) {
      updatedFitments.push(fitmentFields);
    }

    try {
      await addDoc(collection(db, "vehicleFitment"), {
        brand: form.brand || "N/A",
        model: form.model || "N/A",
        type: form.type || "N/A",
        fitments: updatedFitments,
        timestamp: serverTimestamp(),
      });

      alert("✅ Fitment data uploaded successfully!");

      // Reset form
      setForm({ brand: "", model: "", type: "", fitments: [] });
      setFitmentFields({
        size: "",
        wheelDiameter: "",
        wheelWidth: "",
        boltPattern: "",
        offset: "",
        centerBore: "",
      });
    } catch (error) {
      console.error("Upload failed:", error);
      alert("❌ Upload failed. Please try again.");
    }
  };

  // --- Add fitment locally ---
  const handleAddFitment = () => {
    setForm({
      ...form,
      fitments: [...form.fitments, fitmentFields],
    });
    setFitmentFields({
      size: "",
      wheelDiameter: "",
      wheelWidth: "",
      boltPattern: "",
      offset: "",
      centerBore: "",
    });
  };

  // --- Dropdown handling ---
  const handleBrandChange = (e) => {
    setSelectedBrand(e.target.value);
    setSelectedModel("");
    setSelectedType("");
  };
  const handleModelChange = (e) => {
    setSelectedModel(e.target.value);
    setSelectedType("");
  };
  const handleTypeChange = (e) => setSelectedType(e.target.value);

  const brandOptions = Object.keys(vehicleData);
  const modelOptions = selectedBrand ? Object.keys(vehicleData[selectedBrand]) : [];
  const typeOptions =
    selectedModel && vehicleData[selectedBrand]?.[selectedModel]
      ? Object.keys(vehicleData[selectedBrand][selectedModel])
      : [];

  const fitmentList =
    selectedBrand && selectedModel && selectedType
      ? vehicleData[selectedBrand][selectedModel][selectedType]
      : [];

  return (
    <div className="vehicles-container">
      <div className="vehicles-wrapper">
        <h1 className="vehicles-title">Vehicle Fitment Manager</h1>

        {/* ---------------- Upload Form ---------------- */}
        <form className="upload-form" onSubmit={handleUpload}>
          <h2>Add or Update Vehicle Fitment</h2>
          <p className="note">All fields are optional. Fill only what you need.</p>

          <div className="form-grid">
            <input
              type="text"
              placeholder="Brand (e.g. Toyota)"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
            <input
              type="text"
              placeholder="Model (e.g. Hilux)"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
            <select
              value={form.type}
              onChange={(e) => {
                setForm({ ...form, type: e.target.value });
                setFitmentFields({
                  size: "",
                  wheelDiameter: "",
                  wheelWidth: "",
                  boltPattern: "",
                  offset: "",
                  centerBore: "",
                });
              }}
            >
              <option value="">Select Type</option>
              <option value="Wheel">Wheel</option>
              <option value="Tire">Tire</option>
            </select>
          </div>

          {/* ---------------- Dynamic Fitment Fields ---------------- */}
          {form.type === "Tire" && (
            <div className="fitment-fields">
              <input
                type="text"
                placeholder="Size"
                value={fitmentFields.size}
                onChange={(e) =>
                  setFitmentFields({ ...fitmentFields, size: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Diameter"
                value={fitmentFields.wheelDiameter}
                onChange={(e) =>
                  setFitmentFields({
                    ...fitmentFields,
                    wheelDiameter: e.target.value,
                  })
                }
              />
              <input
                type="text"
                placeholder="Width"
                value={fitmentFields.wheelWidth}
                onChange={(e) =>
                  setFitmentFields({
                    ...fitmentFields,
                    wheelWidth: e.target.value,
                  })
                }
              />
            </div>
          )}

          {form.type === "Wheel" && (
            <div className="fitment-fields">
              <input
                type="text"
                placeholder="Bolt Pattern"
                value={fitmentFields.boltPattern}
                onChange={(e) =>
                  setFitmentFields({
                    ...fitmentFields,
                    boltPattern: e.target.value,
                  })
                }
              />
              <input
                type="text"
                placeholder="Offset"
                value={fitmentFields.offset}
                onChange={(e) =>
                  setFitmentFields({
                    ...fitmentFields,
                    offset: e.target.value,
                  })
                }
              />
              <input
                type="text"
                placeholder="Center Bore"
                value={fitmentFields.centerBore}
                onChange={(e) =>
                  setFitmentFields({
                    ...fitmentFields,
                    centerBore: e.target.value,
                  })
                }
              />
            </div>
          )}

          <div className="form-buttons">
            <button type="button" onClick={handleAddFitment} className="btn-secondary">
              ➕ Add Fitment
            </button>
            <button type="submit" className="btn-primary">
              🚀 Upload to Firestore
            </button>
          </div>

          {form.fitments.length > 0 && (
            <ul className="fitment-preview">
              {form.fitments.map((f, idx) => (
                <li key={idx}>
                  {f.size || "-"} {f.wheelDiameter || "-"} {f.wheelWidth || "-"}{" "}
                  {f.boltPattern || "-"} {f.offset || "-"} {f.centerBore || "-"}
                </li>
              ))}
            </ul>
          )}
        </form>

        <hr className="divider" />

        {/* ---------------- View Section ---------------- */}
        <h2>View Uploaded Fitments</h2>
        {loading ? (
          <p>Loading data...</p>
        ) : (
          <>
            <div className="dropdown-section">
              <select value={selectedBrand} onChange={handleBrandChange}>
                <option value="">Select Brand</option>
                {brandOptions.map((brand) => (
                  <option key={brand}>{brand}</option>
                ))}
              </select>

              <select
                value={selectedModel}
                onChange={handleModelChange}
                disabled={!selectedBrand}
              >
                <option value="">Select Model</option>
                {modelOptions.map((model) => (
                  <option key={model}>{model}</option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={handleTypeChange}
                disabled={!selectedModel}
              >
                <option value="">Select Type</option>
                {typeOptions.map((type) => (
                  <option key={type}>{type}</option>
                ))}
              </select>
            </div>

            {selectedType && fitmentList && fitmentList.length > 0 ? (
              <table className="fitment-table">
                <thead>
                  <tr>
                    <th>Size</th>
                    <th>Diameter</th>
                    <th>Width</th>
                    <th>Bolt Pattern</th>
                    <th>Offset</th>
                    <th>Center Bore</th>
                  </tr>
                </thead>
                <tbody>
                  {fitmentList.map((item, index) => (
                    <tr key={index}>
                      <td>{item.size || "-"}</td>
                      <td>{item.wheelDiameter || "-"}</td>
                      <td>{item.wheelWidth || "-"}</td>
                      <td>{item.boltPattern || "-"}</td>
                      <td>{item.offset || "-"}</td>
                      <td>{item.centerBore || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              selectedType && <p>No fitment data available.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Vehicles;
