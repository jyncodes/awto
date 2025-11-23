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

  // merged sizes passed from CatalogBox/Manual (strings like "195/55R16")
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

  // selection & derived state
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  // helpers
  const getCollectionName = (productId) => {
    if (!productId) return null;
    if (productId.startsWith("TI-")) return "products_tires";
    if (productId.startsWith("MA-")) return "products_mags";
    return null;
  };

  // parse size strings like "195/55R16", "195R16", etc.
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

  // fetch base product doc (either products_tires or products_mags)
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
          // default selected price/stock from base product until size selected
          setSelectedPrice(typeof data.price === "number" ? data.price : null);
          setSelectedStock(typeof data.stock === "number" ? data.stock : null);

          // default quantity: 4 for tires, 1 for mags (safe fallback)
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

  // check for .glb model presence
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
        } catch {
          // ignore and continue
        }
      }

      setModelUrl(null);
    };

    checkModel();
  }, [id]);

  // when selectedSize changes, try to find the exact size doc to get price & stock
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

        // 1) try exact 'size' field match
        let q = query(
          colRef,
          where("size", "==", selectedSize),
          where("brand", "==", passedBrand || product.brand || ""),
          where("model", "==", passedModel || product.model || "")
        );
        let snapshot = await getDocs(q);

        // 2) fallback: parse size into tireWidth/rimDiameter (if possible)
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

          setSelectedPrice(typeof data.price === "number" ? data.price : product.price || null);
          setSelectedStock(typeof data.stock === "number" ? data.stock : product.stock || null);
          setSelectedDocId(docSnap.id);

          // adjust quantity if stock is lower
          if (typeof data.stock === "number" && quantity > data.stock) {
            setQuantity(data.stock > 0 ? data.stock : 1);
          }
        } else {
          // fallback to base product values
          setSelectedPrice(typeof product.price === "number" ? product.price : null);
          setSelectedStock(typeof product.stock === "number" ? product.stock : null);
          setSelectedDocId(null);
        }
      } catch (err) {
        console.error("Error fetching size doc:", err);
      }
    };

    fetchSizeDoc();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSize, product]);

  // quantity helpers with stock enforcement
  const decreaseQty = () => setQuantity((q) => Math.max(1, q - 1));
  const increaseQty = () =>
    setQuantity((q) => {
      const max = typeof selectedStock === "number" ? selectedStock : 99;
      return Math.min(max, q + 1);
    });

  // add to cart (includes selected size and pricePerItem)
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
        selectedDocId: selectedDocId || null,
        pricePerItem: selectedPrice,
        quantity,
        totalPrice: (selectedPrice || 0) * quantity,
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

  // reserve flow: pass selected size + pricePerItem to reservation page
  const handleReserveClick = () => {
    if (!selectedSize) return alert("Select a size first.");
    if (!selectedPrice && selectedPrice !== 0) return alert("Price not available.");

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
        {/* LEFT */}
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

        {/* RIGHT */}
        <div className="product-info">
          {vehicleLabel && (
            <div className="fitment-context">
              🚗 Fitment for: <strong>{vehicleLabel}</strong>
            </div>
          )}

          <span className="tag">NEW</span>

          <h2 className="brand-logo">{passedBrand || product.brand}</h2>
          <h1 className="product-name">{passedModel || product.model}</h1>

          <p className="price">
            {selectedPrice !== null
              ? `₱${selectedPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/unit`
              : `₱${(product.price || 0).toLocaleString()}/unit`}
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

          {/* Size selector (merged sizes passed from CatalogBox) */}
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
            {selectedPrice !== null
              ? `₱${(selectedPrice * quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : "N/A"}
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
