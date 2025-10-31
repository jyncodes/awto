// ✅ src/components/dev-components/CarData.jsx
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
import "../../styles/CarData.css";

const CarData = () => {
  const [vehicleData, setVehicleData] = useState({});
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    brand: "",
    model: "",
    year: "",
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

  // === 🔄 Real-time Fetch from Firestore ===
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "vehicleFitment"),
      (snapshot) => {
        const data = {};
        snapshot.forEach((docSnap) => {
          const { brand, model, year, tireFitments = [], wheelFitments = [] } =
            docSnap.data();
          if (!brand || !model) return;
          if (!data[brand]) data[brand] = {};
          if (!data[brand][model]) data[brand][model] = {};
          data[brand][model][year] = {
            tireFitments,
            wheelFitments,
            id: docSnap.id,
          };
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

  // === ➕ Add Fitment ===
  const handleAddFitment = () => {
    if (!form.type) return alert("⚠️ Please select Tire or Wheel first.");

    if (form.type === "Tire") {
      const { tireWidth, aspectRatio, rimDiameter } = fitmentFields;
      if (!tireWidth || !aspectRatio || !rimDiameter)
        return alert("⚠️ Please fill Tire Width, Aspect Ratio, and Rim Diameter.");
      const newFitment = { tireWidth, aspectRatio, rimDiameter };
      setForm((prev) => ({
        ...prev,
        tireFitments: [...prev.tireFitments, newFitment],
      }));
    } else {
      const { wheelDiameter, wheelWidth, boltPattern } = fitmentFields;
      if (!wheelDiameter || !wheelWidth || !boltPattern)
        return alert("⚠️ Please fill Wheel Diameter, Wheel Width, and Bolt Pattern.");
      const newFitment = { wheelDiameter, wheelWidth, boltPattern };
      setForm((prev) => ({
        ...prev,
        wheelFitments: [...prev.wheelFitments, newFitment],
      }));
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

  // === 🗑 Remove Fitment ===
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

  // === 🚀 Upload to Firestore ===
  const handleUpload = async (e) => {
    e.preventDefault();

    if (!form.brand || !form.model || !form.year)
      return alert("⚠️ Please complete Brand, Model, and Year fields.");

    if (form.tireFitments.length === 0 && form.wheelFitments.length === 0)
      return alert("⚠️ Please add at least one fitment before saving.");

    try {
      const ref = collection(db, "vehicleFitment");
      const q = query(
        ref,
        where("brand", "==", form.brand),
        where("model", "==", form.model),
        where("year", "==", form.year)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        const existingDoc = snap.docs[0];
        const docRef = doc(db, "vehicleFitment", existingDoc.id);

        await updateDoc(docRef, {
          tireFitments: arrayUnion(...form.tireFitments),
          wheelFitments: arrayUnion(...form.wheelFitments),
          timestamp: serverTimestamp(),
        });

        alert("✅ Existing vehicle fitment updated successfully!");
      } else {
        await addDoc(ref, {
          brand: form.brand,
          model: form.model,
          year: form.year,
          tireFitments: form.tireFitments,
          wheelFitments: form.wheelFitments,
          timestamp: serverTimestamp(),
        });

        alert("✅ New vehicle fitment added successfully!");
      }

      setForm({
        brand: "",
        model: "",
        year: "",
        type: "",
        tireFitments: [],
        wheelFitments: [],
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

  // ✅ Safe access with optional chaining
  const fitmentList =
    vehicleData?.[selectedBrand]?.[selectedModel]
      ? Object.values(vehicleData[selectedBrand][selectedModel])
          .map((v) =>
            selectedType === "Tire"
              ? v?.tireFitments || []
              : v?.wheelFitments || []
          )
          .flat()
      : [];

  return (
    <div className="vehicles-container">
      <div className="vehicles-wrapper">
        <h1 className="vehicles-title">🚗 Vehicle Fitment Manager</h1>

        {/* Upload Form */}
        <form className="upload-form" onSubmit={handleUpload}>
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
            <input
              type="text"
              placeholder="Year"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
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

          {/* Tire Inputs */}
          {form.type === "Tire" && (
            <div className="fitment-fields">
              <input
                type="text"
                placeholder="Tire Width"
                value={fitmentFields.tireWidth}
                onChange={(e) =>
                  setFitmentFields({ ...fitmentFields, tireWidth: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Aspect Ratio"
                value={fitmentFields.aspectRatio}
                onChange={(e) =>
                  setFitmentFields({ ...fitmentFields, aspectRatio: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Rim Diameter"
                value={fitmentFields.rimDiameter}
                onChange={(e) =>
                  setFitmentFields({ ...fitmentFields, rimDiameter: e.target.value })
                }
              />
            </div>
          )}

          {/* Wheel Inputs */}
          {form.type === "Wheel" && (
            <div className="fitment-fields">
              <input
                type="text"
                placeholder="Wheel Diameter"
                value={fitmentFields.wheelDiameter}
                onChange={(e) =>
                  setFitmentFields({ ...fitmentFields, wheelDiameter: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Wheel Width"
                value={fitmentFields.wheelWidth}
                onChange={(e) =>
                  setFitmentFields({ ...fitmentFields, wheelWidth: e.target.value })
                }
              />
              <input
                type="text"
                placeholder="Bolt Pattern"
                value={fitmentFields.boltPattern}
                onChange={(e) =>
                  setFitmentFields({ ...fitmentFields, boltPattern: e.target.value })
                }
              />
            </div>
          )}

          <div className="form-buttons">
            <button type="button" className="btn-secondary" onClick={handleAddFitment}>
              ➕ Add Fitment
            </button>
            <button type="submit" className="btn-primary">
              🚀 Save to Firestore
            </button>
          </div>
        </form>

        {/* Preview before Upload */}
        {(form.tireFitments.length > 0 || form.wheelFitments.length > 0) && (
          <div className="preview-section">
            <h3>🧾 Fitments to be uploaded:</h3>
            <table className="fitment-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {form.tireFitments.map((f, i) => (
                  <tr key={`tire-${i}`}>
                    <td>{i + 1}</td>
                    <td>Tire</td>
                    <td>
                      {f.tireWidth}/{f.aspectRatio}R{f.rimDiameter}
                    </td>
                    <td>
                      <button onClick={() => handleRemoveFitment(i, "Tire")}>❌</button>
                    </td>
                  </tr>
                ))}
                {form.wheelFitments.map((f, i) => (
                  <tr key={`wheel-${i}`}>
                    <td>{i + 1}</td>
                    <td>Wheel</td>
                    <td>
                      {f.wheelDiameter}x{f.wheelWidth} ({f.boltPattern})
                    </td>
                    <td>
                      <button onClick={() => handleRemoveFitment(i, "Wheel")}>❌</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <hr className="divider" />

        {/* 🔍 View Uploaded Fitments */}
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

export default CarData;
