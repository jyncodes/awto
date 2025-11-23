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

  const {
    sizes = [],
    brand: passedBrand = "",
    model: passedModel = "",
    vehicleLabel = "",
  } = location.state || {};

  const [product, setProduct] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [showAR, setShowAR] = useState(false);
  const [modelUrl, setModelUrl] = useState(null);
  const arViewerRef = useRef(null);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const getCollectionName = (productId) => {
    if (!productId) return null;
    if (productId.startsWith("TI-")) return "products_tires";
    if (productId.startsWith("MA-")) return "products_mags";
    return null;
  };

  const parseSize = (s) => {
    if (!s || typeof s !== "string") return null;
    const m = s.match(/^(\d{2,3})(?:\/(\d{2,3}))?[rR]?(\d{2}(?:\.\d)?)$/);
    if (!m) return null;
    return {
      tireWidth: m[1],
      aspectRatio: m[2] || "",
      rimDiameter: m[3],
    };
  };

  // =====================================
  // FETCH MAIN PRODUCT (use retail instead of price)
  // =====================================
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

        if (docSnap && docSnap.exists()) {
          const data = docSnap.data();

          setProduct({ ...data, id: docSnap.id });
          setMainImage(`${SUPABASE_IMAGE_URL}/${id}.jpg`);

          // ✅ DEFAULT PRICE = retail first, fallback to price
          const defaultRetail = data.retail ?? data.price ?? null;
          setSelectedPrice(defaultRetail);

          setSelectedStock(typeof data.stock === "number" ? data.stock : null);

          const colName = getCollectionName(docSnap.id);
          const isTire =
            colName === "products_tires" ||
            (data.type && data.type.toLowerCase().includes("tire"));

          setQuantity(isTire ? 4 : 1);
        }
      } catch (err) {
        console.error("❌ Error fetching product:", err);
      }
    };

    fetchProduct();
  }, [id]);

  // ================================
  // FIND SIZE-SPECIFIC PRICE (use retail)
  // ================================
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

        let qMain = query(
          colRef,
          where("size", "==", selectedSize),
          where("brand", "==", passedBrand || product.brand || ""),
          where("model", "==", passedModel || product.model || "")
        );

        let snapshot = await getDocs(qMain);

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

          // ✅ Use retail when available
          const retail = data.retail ?? data.price ?? null;

          setSelectedPrice(retail);
          setSelectedStock(data.stock ?? product.stock ?? null);
          setSelectedDocId(docSnap.id);

          if (typeof data.stock === "number" && quantity > data.stock) {
            setQuantity(data.stock > 0 ? data.stock : 1);
          }
        } else {
          // fallback to main product retail
          const fallbackRetail = product.retail ?? product.price ?? null;
          setSelectedPrice(fallbackRetail);
          setSelectedStock(product.stock ?? null);
          setSelectedDocId(null);
        }
      } catch (err) {
        console.error("Error fetching size doc:", err);
      }
    };

    fetchSizeDoc();
  }, [selectedSize, product]);

  // quantity helpers
  const decreaseQty = () => setQuantity((q) => Math.max(1, q - 1));
  const increaseQty = () =>
    setQuantity((q) => {
      const max = typeof selectedStock === "number" ? selectedStock : 99;
      return Math.min(max, q + 1);
    });

  // ================================
  // ADD TO CART (use retail)
  // ================================
  const handleAddToCart = async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to add selections.");
    if (!product?.id) return alert("Product data not ready.");
    if (!selectedSize) return alert("Please select a size first.");
    if (!selectedPrice && selectedPrice !== 0)
      return alert("Price not available for selected size.");

    try {
      const cartRef = collection(db, "cartSelections");

      const q = query(
        cartRef,
        where("userId", "==", user.uid),
        where("productId", "==", product.id),
        where("selectedSize", "==", selectedSize)
      );

      const existing = await getDocs(q);

      if (!existing.empty) {
        return alert("Item with this size is already in My Selections.");
      }

      await addDoc(cartRef, {
        userId: user.uid,
        productId: product.id,
        productName: `${passedBrand || product.brand || ""} ${passedModel || product.model || ""} (${selectedSize})`,
        brand: passedBrand || product.brand || "Unknown",
        model: passedModel || product.model || "",
        selectedSize,
        selectedDocId,
        pricePerItem: selectedPrice, // ✅ USING RETAIL
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

  // ================================
  // RESERVE (use retail)
  // ================================
  const handleReserveClick = () => {
    if (!selectedSize) return alert("Select a size first.");
    if (!selectedPrice && selectedPrice !== 0) return alert("Price not available.");

    navigate(`/reservation/${product.id}`, {
      state: {
        vehicleLabel,
        selectedSize,
        product,
        selectedDocId,
        pricePerItem: selectedPrice, // ✅ RETAIL
        quantity,
      },
    });
  };

  const handleARClick = () => {
    if (!modelUrl) return alert("⚠ No 3D model found.");
    setShowAR(true);
  };

  if (!product) return <div className="view-product">Loading product…</div>;

  const hasGLB = !!modelUrl;

  return (
    <div className="view-product">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="product-container">
        {/* ---------- LEFT IMAGES ---------- */}
        <div className="product-images">
          {hasGLB ? (
            <div className="ar-viewer-container">
              {!showAR ? <ModelViewer modelUrl={modelUrl} /> : <ARViewer src={modelUrl} />}
            </div>
          ) : (
            <img
              src={mainImage || "https://placehold.co/300x300?text=No+Image"}
              alt="Main"
              className="main-image"
            />
          )}
        </div>

        {/* ---------- RIGHT INFO ---------- */}
        <div className="product-info">
          {vehicleLabel && (
            <div className="fitment-context">
              🚗 Fitment for: <strong>{vehicleLabel}</strong>
            </div>
          )}

          <span className="tag">NEW</span>

          <h2 className="brand-logo">{passedBrand || product.brand}</h2>
          <h1 className="product-name">{passedModel || product.model}</h1>

          {/* ================================ */}
          {/* FINAL DISPLAY OF RETAIL PRICE */}
          {/* ================================ */}
          <p className="price">
            ₱
            {(selectedPrice ?? product.retail ?? product.price ?? 0).toLocaleString(
              undefined,
              { minimumFractionDigits: 2, maximumFractionDigits: 2 }
            )}
            /unit
          </p>

          {/* Quantity */}
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

          {/* Size selector */}
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

          {/* Total */}
          <div style={{ margin: "12px 0", fontWeight: 700 }}>
            Total ({quantity} item{quantity > 1 ? "s" : ""}):{" "}
            ₱
            {(selectedPrice * quantity).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          <details className="desc-section" open>
            <summary>Description</summary>
            <p>{product.description || "No description available."}</p>
          </details>

          <div className="button-row" style={{ marginTop: 12 }}>
            {hasGLB && (
              <button className="ar-button" onClick={handleARClick}>
                Visualize it in your vehicle
              </button>
            )}

            <button
              className="reserve-button"
              onClick={handleReserveClick}
              disabled={!selectedSize || (typeof selectedPrice !== "number" && selectedPrice !== 0)}
            >
              Reserve Now
            </button>

            <button
              className="icon-button"
              onClick={handleAddToCart}
              title="Add to My Selections"
              disabled={!selectedSize || (typeof selectedPrice !== "number" && selectedPrice !== 0)}
            >
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
