import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  addDoc,
  updateDoc,
  doc,
  arrayUnion,
  serverTimestamp,
  onSnapshot,
  getDocs,
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
    tireFitments: [],
    wheelFitments: [],
  });

  const [fitmentFields, setFitmentFields] = useState({
    tireWidth: "",
    aspectRatio: "",
    rimDiameter: "",
    wheelDiameter: "",
    wheelWidth: "",
    boltPattern: "",
  });

  // === Real-time Fetch from Firestore ===
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "vehicleFitment"),
      (snapshot) => {
        const data = {};
        snapshot.forEach((docSnap) => {
          const { brand, model, tireFitments = [], wheelFitments = [] } =
            docSnap.data();
          if (!brand || !model) return;
          if (!data[brand]) data[brand] = {};
          data[brand][model] = { tireFitments, wheelFitments, id: docSnap.id };
        });
        setVehicleData(data);
        setLoading(false);
      },
      (error) => {
        console.error("Snapshot error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // === Add Fitment (Separate Tire/Wheel Arrays) ===
  const handleAddFitment = () => {
    const isEmpty = Object.values(fitmentFields).every((v) => v.trim() === "");
    if (isEmpty) return alert("⚠️ Please fill at least one fitment field.");

    let newFitment;
    if (form.type === "Tire") {
      newFitment = {
        tireWidth: fitmentFields.tireWidth.trim(),
        aspectRatio: fitmentFields.aspectRatio.trim(),
        rimDiameter: fitmentFields.rimDiameter.trim(),
      };

      const isDuplicate = form.tireFitments.some(
        (f) => JSON.stringify(f) === JSON.stringify(newFitment)
      );
      if (isDuplicate)
        return alert("⚠️ Duplicate tire fitment detected. Not added again.");

      setForm({
        ...form,
        tireFitments: [...form.tireFitments, newFitment],
      });
    } else if (form.type === "Wheel") {
      newFitment = {
        wheelDiameter: fitmentFields.wheelDiameter.trim(),
        wheelWidth: fitmentFields.wheelWidth.trim(),
        boltPattern: fitmentFields.boltPattern.trim(),
      };

      const isDuplicate = form.wheelFitments.some(
        (f) => JSON.stringify(f) === JSON.stringify(newFitment)
      );
      if (isDuplicate)
        return alert("⚠️ Duplicate wheel fitment detected. Not added again.");

      setForm({
        ...form,
        wheelFitments: [...form.wheelFitments, newFitment],
      });
    }

    setFitmentFields({
      tireWidth: "",
      aspectRatio: "",
      rimDiameter: "",
      wheelDiameter: "",
      wheelWidth: "",
      boltPattern: "",
    });
  };

  // === Remove Fitment (before saving) ===
  const handleRemoveFitment = (index, type) => {
    if (type === "Tire") {
      setForm({
        ...form,
        tireFitments: form.tireFitments.filter((_, i) => i !== index),
      });
    } else {
      setForm({
        ...form,
        wheelFitments: form.wheelFitments.filter((_, i) => i !== index),
      });
    }
  };

  // === Upload or Update Vehicle Fitment ===
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.brand || !form.model || !form.type)
      return alert("⚠️ Please fill Brand, Model, and Type.");

    try {
      const ref = collection(db, "vehicleFitment");
      const q = query(
        ref,
        where("brand", "==", form.brand),
        where("model", "==", form.model)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const existingDoc = snap.docs[0];
        const existingData = existingDoc.data();
        const docRef = doc(db, "vehicleFitment", existingDoc.id);

        const existingTires = existingData.tireFitments || [];
        const existingWheels = existingData.wheelFitments || [];

        const tireAdd = form.tireFitments.filter(
          (f) => !existingTires.some((ef) => JSON.stringify(ef) === JSON.stringify(f))
        );
        const wheelAdd = form.wheelFitments.filter(
          (f) => !existingWheels.some((ef) => JSON.stringify(ef) === JSON.stringify(f))
        );

        if (tireAdd.length === 0 && wheelAdd.length === 0)
          return alert("⚠️ All fitments already exist — no new entries added.");

        const updateData = { timestamp: serverTimestamp() };
        if (tireAdd.length > 0)
          updateData.tireFitments = arrayUnion(...tireAdd);
        if (wheelAdd.length > 0)
          updateData.wheelFitments = arrayUnion(...wheelAdd);

        await updateDoc(docRef, updateData);
        alert("✅ Existing vehicle updated successfully!");
      } else {
        await addDoc(ref, {
          brand: form.brand,
          model: form.model,
          tireFitments: form.tireFitments,
          wheelFitments: form.wheelFitments,
          timestamp: serverTimestamp(),
        });
        alert("✅ New vehicle added successfully!");
      }

      setForm({
        brand: "",
        model: "",
        type: "",
        tireFitments: [],
        wheelFitments: [],
      });
      setFitmentFields({
        tireWidth: "",
        aspectRatio: "",
        rimDiameter: "",
        wheelDiameter: "",
        wheelWidth: "",
        boltPattern: "",
      });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("❌ Upload failed. Check Firestore rules or try again.");
    }
  };

  // === Dropdown Logic ===
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

  const brandOptions = Object.keys(vehicleData || {});
  const modelOptions = selectedBrand
    ? Object.keys(vehicleData[selectedBrand] || {})
    : [];
  const typeOptions = ["Tire", "Wheel"];

  const fitmentList =
    selectedBrand &&
    selectedModel &&
    selectedType &&
    vehicleData[selectedBrand] &&
    vehicleData[selectedBrand][selectedModel]
      ? vehicleData[selectedBrand][selectedModel][
          selectedType === "Tire" ? "tireFitments" : "wheelFitments"
        ] || []
      : [];

  return (
    <div className="vehicles-container">
      <div className="vehicles-wrapper">
        <h1 className="vehicles-title">🚗 Vehicle Fitment Manager</h1>

        {/* === Upload Section === */}
        <form className="upload-form" onSubmit={handleUpload}>
          <h2>Upload or Update Vehicle Fitment</h2>
          <div className="form-grid">
            <input
              type="text"
              placeholder="Brand"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value })}
            />
            <input
              type="text"
              placeholder="Model"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              <option value="">Select Type</option>
              <option value="Tire">Tire</option>
              <option value="Wheel">Wheel</option>
            </select>
          </div>

          {/* === Fitment Inputs === */}
          {form.type === "Tire" && (
            <div className="fitment-fields">
              <input
                type="text"
                placeholder="Tire Width (e.g., 225)"
                value={fitmentFields.tireWidth}
                onChange={(e) =>
                  setFitmentFields({
                    ...fitmentFields,
                    tireWidth: e.target.value,
                  })
                }
              />
              <input
                type="text"
                placeholder="Aspect Ratio (e.g., 45)"
                value={fitmentFields.aspectRatio}
                onChange={(e) =>
                  setFitmentFields({
                    ...fitmentFields,
                    aspectRatio: e.target.value,
                  })
                }
              />
              <input
                type="text"
                placeholder="Rim Diameter (e.g., 17)"
                value={fitmentFields.rimDiameter}
                onChange={(e) =>
                  setFitmentFields({
                    ...fitmentFields,
                    rimDiameter: e.target.value,
                  })
                }
              />
            </div>
          )}

          {form.type === "Wheel" && (
            <div className="fitment-fields">
              <input
                type="text"
                placeholder="Wheel Diameter (e.g., 18)"
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
                placeholder="Wheel Width (e.g., 8.5)"
                value={fitmentFields.wheelWidth}
                onChange={(e) =>
                  setFitmentFields({
                    ...fitmentFields,
                    wheelWidth: e.target.value,
                  })
                }
              />
              <input
                type="text"
                placeholder="Bolt Pattern (e.g., 5x114.3)"
                value={fitmentFields.boltPattern}
                onChange={(e) =>
                  setFitmentFields({
                    ...fitmentFields,
                    boltPattern: e.target.value,
                  })
                }
              />
            </div>
          )}

          <div className="form-buttons">
            <button
              type="button"
              onClick={handleAddFitment}
              className="btn-secondary"
            >
              ➕ Add Fitment
            </button>
            <button type="submit" className="btn-primary">
              🚀 Save to Firestore
            </button>
          </div>

          {/* === Preview Fitments Before Save === */}
          {form.type === "Tire" && form.tireFitments.length > 0 && (
            <ul className="fitment-preview">
              {form.tireFitments.map((f, i) => (
                <li key={i} className="fitment-item">
                  <span>
                    {f.tireWidth} / {f.aspectRatio} / {f.rimDiameter}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFitment(i, "Tire")}
                    className="btn-remove"
                  >
                    ❌ Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          {form.type === "Wheel" && form.wheelFitments.length > 0 && (
            <ul className="fitment-preview">
              {form.wheelFitments.map((f, i) => (
                <li key={i} className="fitment-item">
                  <span>
                    {f.wheelDiameter} / {f.wheelWidth} / {f.boltPattern}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFitment(i, "Wheel")}
                    className="btn-remove"
                  >
                    ❌ Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        <hr className="divider" />

        {/* === View Section === */}
        <h2>View Uploaded Fitments</h2>
        {loading ? (
          <p>Loading data...</p>
        ) : (
          <>
            <div className="dropdown-section">
              <select value={selectedBrand} onChange={handleBrandChange}>
                <option value="">Select Brand</option>
                {brandOptions.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>

              <select
                value={selectedModel}
                onChange={handleModelChange}
                disabled={!selectedBrand}
              >
                <option value="">Select Model</option>
                {modelOptions.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={handleTypeChange}
                disabled={!selectedModel}
              >
                <option value="">Select Type</option>
                {typeOptions.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            {selectedType && fitmentList.length > 0 ? (
              <table className="fitment-table">
                <thead>
                  <tr>
                    {selectedType === "Wheel" ? (
                      <>
                        <th>Wheel Diameter</th>
                        <th>Wheel Width</th>
                        <th>Bolt Pattern</th>
                      </>
                    ) : (
                      <>
                        <th>Tire Width</th>
                        <th>Aspect Ratio</th>
                        <th>Rim Diameter</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {fitmentList.map((item, i) => (
                    <tr key={i}>
                      <td>{item.tireWidth || item.wheelDiameter || "-"}</td>
                      <td>{item.aspectRatio || item.wheelWidth || "-"}</td>
                      <td>{item.rimDiameter || item.boltPattern || "-"}</td>
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
