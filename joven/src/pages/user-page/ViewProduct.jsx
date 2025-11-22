import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { FiShoppingCart } from "react-icons/fi";
import { db, auth } from "../../firebase";
import "../../styles/user-styles/ViewProduct.css";

import ModelViewer from "../../components/user-components/ModelViewer";
import ARViewer from "../../components/user-components/ARViewer";

const SUPABASE_BASE_URL =
  "https://ojyapkmalpnfwskpozbx.supabase.co/storage/v1/object/public/models";

const SUPABASE_IMAGE_URL =
  "https://ojyapkmalpnfwskpozbx.supabase.co/storage/v1/object/public/images";

const ViewProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Read merged sizes from CatalogBox/Manual
  const {
    sizes = [],
    brand: passedBrand = "",
    model: passedModel = "",
    vehicleLabel = "",
    fitment = {},
  } = location.state || {};

  const [product, setProduct] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [showAR, setShowAR] = useState(false);

  const [modelUrl, setModelUrl] = useState(null);
  const arViewerRef = useRef(null);

  // User-selected size and derived data
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);

  // quantity: default 4 for tires, 1 for mags
  const [quantity, setQuantity] = useState(1);

  const getCollectionName = (productId) => {
    if (!productId) return null;
    if (productId.startsWith("TI-")) return "products_tires";
    if (productId.startsWith("MA-")) return "products_mags";
    return null;
  };

  const parseSize = (s) => {
    if (!s || typeof s !== "string") return null;
    const m = s.match(/^(\d{2,3})\/?(\d{2,3})?R?(\d{2}(?:\.\d)?)$/i);
    if (!m) return null;
    return {
      tireWidth: m[1] || "",
      aspectRatio: m[2] || "",
      rimDiameter: m[3] || "",
    };
  };

  // FETCH PRODUCT
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const collectionName = getCollectionName(id);
        let docSnap;

        if (!collectionName) {
          const tiresRef = doc(db, "products_tires", id);
          const magsRef = doc(db, "products_mags", id);

          docSnap = await getDoc(tiresRef);
          if (!docSnap.exists()) docSnap = await getDoc(magsRef);
        } else {
          const docRef = doc(db, collectionName, id);
          docSnap = await getDoc(docRef);
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProduct({ ...data, id: docSnap.id });

          const imgUrl = `${SUPABASE_IMAGE_URL}/${id}.jpg`;
          setMainImage(imgUrl);

          // default quantity
          const colName = getCollectionName(docSnap.id);
          const isTire =
            colName === "products_tires" ||
            (data.type && data.type.toLowerCase().includes("tire"));
          setQuantity(isTire ? 4 : 1);

          // default price/stock
          setSelectedPrice(typeof data.price === "number" ? data.price : null);
          setSelectedStock(typeof data.stock === "number" ? data.stock : null);
        }
      } catch (err) {
        console.error("❌ Error fetching product:", err);
      }
    };

    fetchProduct();
  }, [id]);

  // LOAD MODEL
  useEffect(() => {
    const checkModel = async () => {
      if (!id) return;
      const paths = [
        `${SUPABASE_BASE_URL}/${id}.glb`,
        `${SUPABASE_BASE_URL}/${id}.GLB`,
        `${SUPABASE_BASE_URL}/products_tires/${id}.glb`,
        `${SUPABASE_BASE_URL}/products_tires/${id}.GLB`,
        `${SUPABASE_BASE_URL}/products_mags/${id}.glb`,
        `${SUPABASE_BASE_URL}/products_mags/${id}.GLB`,
      ];

      for (const url of paths) {
        try {
          const res = await fetch(url, { method: "HEAD" });
          if (res.ok) {
            setModelUrl(url);
            return;
          }
        } catch {}
      }

      setModelUrl(null);
    };

    checkModel();
  }, [id]);

  // UPDATE SELECTED SIZE PRICE/STOCK
  useEffect(() => {
    if (!selectedSize || !product) return;

    const fetchSizeDoc = async () => {
      try {
        const colName =
          getCollectionName(product.id) ||
          (product.type && product.type.toLowerCase().includes("tire")
            ? "products_tires"
            : "products_mags");
        if (!colName) return;

        const colRef = collection(db, colName);

        let q = query(
          colRef,
          where("size", "==", selectedSize),
          where("brand", "==", passedBrand || product.brand || ""),
          where("model", "==", passedModel || product.model || "")
        );
        let snapshot = await getDocs(q);

        if (snapshot.empty) {
          const parsed = parseSize(selectedSize);
          if (parsed) {
            const q2 = query(
              colRef,
              where("tireWidth", "==", parsed.tireWidth),
              where("rimDiameter", "==", parsed.rimDiameter),
              where("brand", "==", passedBrand || product.brand || ""),
              where("model", "==", passedModel || product.model || "")
            );
            snapshot = await getDocs(q2);
          }
        }

        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();
          setSelectedPrice(typeof data.price === "number" ? data.price : null);
          setSelectedStock(typeof data.stock === "number" ? data.stock : null);
          setSelectedDocId(docSnap.id);
          if (typeof data.stock === "number" && quantity > data.stock) setQuantity(data.stock || 1);
        } else {
          setSelectedPrice(typeof product.price === "number" ? product.price : null);
          setSelectedStock(typeof product.stock === "number" ? product.stock : null);
          setSelectedDocId(null);
        }
      } catch (err) {
        console.error("Error fetching size doc:", err);
      }
    };

    fetchSizeDoc();
  }, [selectedSize, product]);

  // ADD TO CART
  const handleAddToCart = async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");
    if (!product?.id) return alert("Product data not ready.");
    if (!selectedSize) return alert("Select a size.");
    if (!selectedPrice) return alert("Price not available.");

    try {
      const cartRef = collection(db, "cartSelections");
      const q = query(
        cartRef,
        where("userId", "==", user.uid),
        where("productId", "==", product.id),
        where("selectedSize", "==", selectedSize)
      );
      const existing = await getDocs(q);

      if (!existing.empty) return alert("Item already in My Selections.");

      await addDoc(cartRef, {
        userId: user.uid,
        productId: product.id,
        productName: `${passedBrand} ${passedModel} (${selectedSize})`,
        brand: passedBrand || product.brand || "Unknown",
        model: passedModel || product.model || "",
        selectedSize,
        selectedDocId: selectedDocId || null,
        pricePerItem: selectedPrice,
        quantity,
        totalPrice: selectedPrice * quantity,
        createdAt: serverTimestamp(),
        vehicleLabel: vehicleLabel || null,
        collection: getCollectionName(product.id),
      });

      alert("✔ Added to My Selections!");
    } catch (err) {
      console.error("Add to cart error:", err);
      alert("Failed to add. Try again.");
    }
  };

  const handleReserveClick = () => {
    if (!selectedSize) return alert("Select a size first.");
    if (!selectedPrice) return alert("Price not available.");

    navigate(`/reservation/${product.id}`, {
      state: {
        vehicleLabel,
        selectedSize,
        product,
        selectedDocId,
        pricePerItem: selectedPrice,
        quantity,
      },
    });
  };

  const decreaseQty = () => setQuantity((q) => Math.max(1, q - 1));
  const increaseQty = () => {
    const max = typeof selectedStock === "number" ? selectedStock : 99;
    setQuantity((q) => Math.min(max, q + 1));
  };

  if (!product) return <div className="view-product">Loading product…</div>;

  const colName =
    getCollectionName(product.id) ||
    (product.type && product.type.toLowerCase().includes("tire")
      ? "products_tires"
      : "products_mags");
  const isTire = colName === "products_tires";

  const topTitle = `${passedBrand || product.brand || ""} ${passedModel || product.model || ""}`.trim();
  const topSubtitle = selectedSize ? `${selectedSize}` : "";

  return (
    <div className="view-product">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="product-container">
        <div className="product-images">
          {modelUrl ? (
            <div className="ar-viewer-container">
              {!showAR ? <ModelViewer modelUrl={modelUrl} /> : <ARViewer src={modelUrl} />}
            </div>
          ) : (
            <img src={mainImage || "https://placehold.co/300x300?text=No+Image"} alt="Main" className="main-image" />
          )}
        </div>

        <div className="product-info">
          {vehicleLabel && (
            <div className="fitment-context">
              🚗 Fitment for: <strong>{vehicleLabel}</strong>
            </div>
          )}

          <span className="tag">NEW</span>

          <div style={{ marginBottom: "0.4rem" }}>
            <h2 className="brand-logo" style={{ margin: 0 }}>{topTitle}</h2>
            {topSubtitle && <div style={{ color: "#333", fontWeight: 600 }}>{topSubtitle}</div>}
          </div>

          <p className="price">
            {selectedPrice ? `₱${selectedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/Tire` : `₱${(product.price || 0).toLocaleString()}/Tire`}
          </p>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 14 }}>Quantity</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={decreaseQty} className="qty-btn">-</button>
                <div style={{ minWidth: 36, textAlign: "center" }}>{quantity}</div>
                <button onClick={increaseQty} className="qty-btn">+</button>
              </div>
              {typeof selectedStock === "number" && (
                <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>Stock: {selectedStock}</div>
              )}
            </div>
          </div>

          {sizes.length > 0 && (
            <div className="size-selector" style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 6 }}>Select Size:</label>
              <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                <option value="">Choose a size</option>
                {sizes.map((s, i) => (
                  <option key={i} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ margin: "12px 0", fontWeight: 700 }}>
            Total ({quantity} {isTire ? "tires" : "item(s)"}):{" "}
            {selectedPrice ? `₱${(selectedPrice * quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "N/A"}
          </div>

          <details className="desc-section" open>
            <summary>Description</summary>
            <p>{product.description || "No description available."}</p>
          </details>

          <div className="button-row" style={{ marginTop: 12 }}>
            {modelUrl && (
              <button className="ar-button" onClick={() => setShowAR(true)}>
                Visualize it in your vehicle
              </button>
            )}

            <button className="reserve-button" onClick={handleReserveClick}>
              {isTire ? `Reserve ${quantity} Tires Now` : "Reserve Wheel Now"}
            </button>

            <button className="icon-button" onClick={handleAddToCart} title="Add to My Selections">
              <FiShoppingCart size={24} />
            </button>
          </div>

          {showAR && (
            <button className="exit-ar-button" onClick={() => setShowAR(false)}>
              Exit AR Mode
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewProduct;
