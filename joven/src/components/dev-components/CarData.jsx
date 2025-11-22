import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/CarData.css";

const CarData = () => {
  const [vehicleData, setVehicleData] = useState({});
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [loading, setLoading] = useState(true);
  const [editDocId, setEditDocId] = useState(null);

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
          if (!data[brand][model]) data[brand][model] = [];
          data[brand][model].push({
            tireFitments,
            wheelFitments,
            id: docSnap.id,
            brand,
            model,
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

    if (!form.brand || !form.model)
      return alert("⚠️ Complete Brand and Model fields.");
    if (form.tireFitments.length === 0 && form.wheelFitments.length === 0)
      return alert("⚠️ Add at least one fitment.");

    try {
      if (editDocId) {
        const docRef = doc(db, "vehicleFitment", editDocId);
        await updateDoc(docRef, {
          ...form,
          timestamp: serverTimestamp(),
        });
        alert("✅ Vehicle fitment updated successfully!");
        setEditDocId(null);
      } else {
        const ref = collection(db, "vehicleFitment");
        await addDoc(ref, {
          ...form,
          timestamp: serverTimestamp(),
        });
        alert("✅ New vehicle fitment added successfully!");
      }

      setForm({
        brand: "",
        model: "",
        type: "",
        tireFitments: [],
        wheelFitments: [],
      });
    } catch (err) {
      console.error("Upload failed:", err);
      alert("❌ Upload failed. Try again.");
    }
  };

  const handleEdit = (data, id) => {
    setEditDocId(id);
    setForm({
      brand: data.brand,
      model: data.model,
      type: "",
      tireFitments: data.tireFitments || [],
      wheelFitments: data.wheelFitments || [],
    });
    setSelectedBrand(data.brand);
    setSelectedModel(data.model);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this vehicle data?"))
      return;
    try {
      await deleteDoc(doc(db, "vehicleFitment", id));
      alert("🗑️ Vehicle data deleted successfully.");
    } catch (error) {
      console.error("Delete failed:", error);
      alert("❌ Failed to delete data.");
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
              {editDocId ? "💾 Update Vehicle" : "🚀 Save to Firestore"}
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
                    <th>Tire Fitments</th>
                    <th>Wheel Fitments</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {fitmentList.map((data) => (
                    <tr key={data.id}>
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
                          onClick={() => handleDelete(data.id)}
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
