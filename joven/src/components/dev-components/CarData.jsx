import React, { useState, useEffect } from "react";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  deleteField,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/CarData.css";

const CarData = () => {
  const [vehicleData, setVehicleData] = useState({});
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [loading, setLoading] = useState(true);
const [editingYear, setEditingYear] = useState(null);

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

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "vehicleFitment"),
      (snapshot) => {
        const data = {};
        snapshot.forEach((docSnap) => {
        const { brand, model, years = {} } = docSnap.data();
        if (!brand || !model) return;

        if (!data[brand]) data[brand] = {};
        if (!data[brand][model]) data[brand][model] = [];

        Object.entries(years).forEach(([year, fitment]) => {
          data[brand][model].push({
            id: docSnap.id,
            brand,
            model,
            year,
            tireFitments: fitment.tireFitments || [],
            wheelFitments: fitment.wheelFitments || [],
          });
          });
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

  const handleAddFitment = () => {
    if (!form.type) return alert("⚠️ Please select Tire or Wheel first.");

    if (form.type === "Tire") {
      const { tireWidth, aspectRatio, rimDiameter } = fitmentFields;
      if (!tireWidth || !aspectRatio || !rimDiameter)
        return alert("⚠️ Fill Tire Width, Aspect Ratio, and Rim Diameter.");
      const newFitment = { tireWidth, aspectRatio, rimDiameter };
      setForm((prev) => ({
        ...prev,
        tireFitments: [...prev.tireFitments, newFitment],
      }));
    } else {
      const { wheelDiameter, wheelWidth, boltPattern } = fitmentFields;
      if (!wheelDiameter || !wheelWidth || !boltPattern)
        return alert("⚠️ Fill Wheel Diameter, Wheel Width, and Bolt Pattern.");

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

const handleUpload = async (e) => {
  e.preventDefault();

  const { brand, model, year, tireFitments, wheelFitments } = form;

  if (!brand || !model || !year)
    return alert("⚠️ Brand, Model, and Year are required.");

  if (tireFitments.length === 0 && wheelFitments.length === 0)
    return alert("⚠️ Add at least one fitment.");

  try {
    // 🔑 ONE document per Brand + Model
    const docId = `${brand.toLowerCase()}_${model.toLowerCase()}`;
    const docRef = doc(db, "vehicleFitment", docId);

     // 🔍 1. Read existing document
    const snap = await getDoc(docRef);
    const existingYears = snap.exists() ? snap.data().years || {} : {};

    const existingTires = existingYears?.[year]?.tireFitments || [];
    const existingWheels = existingYears?.[year]?.wheelFitments || [];

    // ➕ 2. Append new fitments
    const mergedTires = [...existingTires, ...tireFitments];
    const mergedWheels = [...existingWheels, ...wheelFitments];

    // 💾 3. Save merged data
    await setDoc(
      docRef,
      {
        brand,
        model,
        years: {
          [year]: {
            tireFitments: mergedTires,
            wheelFitments: mergedWheels,
          },
        },
        timestamp: serverTimestamp(),
      },
      { merge: true }
    );


    alert("✅ Vehicle fitment saved under one document!");

    setForm({
      brand: "",
      model: "",
      year: "",
      type: "",
      tireFitments: [],
      wheelFitments: [],
    });
    setEditingYear(null);

  } catch (err) {
    console.error("Upload failed:", err);
    alert("❌ Upload failed.");
  }
};


const handleEdit = (data) => {
  setEditingYear(data.year);

  setForm({
    brand: data.brand,
    model: data.model,
    year: data.year,
    type: "",
    tireFitments: data.tireFitments || [],
    wheelFitments: data.wheelFitments || [],
  });

  setSelectedBrand(data.brand);
  setSelectedModel(data.model);
};


const handleDelete = async (year) => {
  if (!selectedBrand || !selectedModel) return;

  if (!window.confirm(`Delete fitment for year ${year}?`)) return;

  try {
    const docId = `${selectedBrand.toLowerCase()}_${selectedModel.toLowerCase()}`;
    const docRef = doc(db, "vehicleFitment", docId);

    await updateDoc(docRef, {
      [`years.${year}`]: deleteField(),
    });

    alert("🗑️ Year fitment deleted.");
  } catch (err) {
    console.error(err);
    alert("❌ Failed to delete year.");
  }
};


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
    vehicleData?.[selectedBrand]?.[selectedModel] || [];

  return (
    <div className="vehicles-container">
      <div className="vehicles-wrapper">
        <h1 className="vehicles-title">🚗 Vehicle Fitment Manager</h1>

        <form className="upload-form" onSubmit={handleUpload}>
          <div className="form-grid">
          <input
            type="text"
            placeholder="Brand"
            value={form.brand}
            disabled={!!editingYear}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
          />
          <input
            type="text"
            placeholder="Model"
            value={form.model}
            disabled={!!editingYear}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
          />

            <input
            type="text"
            placeholder="Year (e.g. 2018 or 2018–2022)"
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
                  setFitmentFields({
                    ...fitmentFields,
                    aspectRatio: e.target.value,
                  })
                }
              />
              <input
                type="text"
                placeholder="Rim Diameter"
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
                placeholder="Wheel Diameter"
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
                placeholder="Wheel Width"
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
                placeholder="Bolt Pattern"
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
              className="btn-secondary"
              onClick={handleAddFitment}
            >
              ➕ Add Fitment
            </button>
            <button type="submit" className="btn-primary">
              {editingYear ? "💾 Update Year Fitment" : "🚀 Save to Firestore"}
            </button>
          </div>
        </form>

        <hr className="divider" />

        <h1 className="view-fitments-title">🚗 View Uploaded Fitments</h1>
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
            </div>

            {selectedBrand && selectedModel && (
              <table className="fitment-table">
                <thead>
                  <tr>
                    <th>Year</th>
                    <th>Tire Fitments</th>
                    <th>Wheel Fitments</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fitmentList.map((data) => (
                    <tr key={data.id}>
                      <td>{data.year || "—"}</td>
                      <td>{data.tireFitments?.length || 0}</td>
                      <td>{data.wheelFitments?.length || 0}</td>
                      <td>
                        <button
                          className="btn-edit"
                          onClick={() => handleEdit(data, data.id)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(data.year)}
                        >
                          🗑️ Delete
                        </button>

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CarData;
