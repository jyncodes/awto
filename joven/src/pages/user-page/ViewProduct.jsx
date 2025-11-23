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
  "https://ojyapkmalpnfwskpozbx.supabase.co/storage/v1/object/public/Images";

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

  // ================================
  // FETCH MAIN PRODUCT + IMAGE FALLBACK
  // ================================
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const collectionName = getCollectionName(id);
        let docSnap;

        if (!collectionName) {
          docSnap = await getDoc(doc(db, "products_tires", id));
          if (!docSnap.exists())
            docSnap = await getDoc(doc(db, "products_mags", id));
        } else {
          docSnap = await getDoc(doc(db, collectionName, id));
        }

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProduct({ ...data, id: docSnap.id });

          // 🔥 AUTO-SELECT SIZE IF NO SIZE LIST PROVIDED
          if (!sizes || sizes.length === 0) {
            setSelectedSize("default");
          }

          const pngUrl = `${SUPABASE_IMAGE_URL}/${id}.png`;
          const jpegUrl = `${SUPABASE_IMAGE_URL}/${id}.jpeg`;

          fetch(pngUrl, { method: "HEAD" })
            .then((res) => {
              if (res.ok) setMainImage(pngUrl);
              else {
                fetch(jpegUrl, { method: "HEAD" })
                  .then((res2) => {
                    if (res2.ok) setMainImage(jpegUrl);
                    else setMainImage(null);
                  })
                  .catch(() => setMainImage(null));
              }
            })
            .catch(() => setMainImage(null));

          const defaultRetail = data.retail ?? data.price ?? null;
          setSelectedPrice(defaultRetail);

          setSelectedStock(
            typeof data.stock === "number" ? data.stock : null
          );

          const isTire =
            collectionName === "products_tires" ||
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
  // CHECK GLB MODEL
  // ================================
  useEffect(() => {
    const checkModel = async () => {
      if (!id) return;
      const paths = [
        `${SUPABASE_BASE_URL}/${id}.glb`,
        `${SUPABASE_BASE_URL}/${id}.GLB`,
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

  // ================================
  // SIZE-SPECIFIC PRICE
  // ================================
  useEffect(() => {
    if (!product) return;

    // If no size selector exists, ignore this logic
    if (!sizes || sizes.length === 0) {
      setSelectedPrice(product.retail ?? product.price ?? null);
      setSelectedStock(product.stock ?? null);
      return;
    }

    if (!selectedSize) return;
    const fetchSizeDoc = async () => {
      try {
        const colName =
          getCollectionName(product.id) ||
          (product.type && product.type.toLowerCase().includes("tire")
            ? "products_tires"
            : "products_mags");

        const colRef = collection(db, colName);

        let qMain = query(
          colRef,
          where("size", "==", selectedSize),
          where("brand", "==", passedBrand || product.brand || ""),
          where("model", "==", passedModel || product.model || "")
        );

        let snapshot = await getDocs(qMain);

        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const data = docSnap.data();

          const retail = data.retail ?? data.price ?? null;
          setSelectedPrice(retail);
          setSelectedStock(data.stock ?? product.stock ?? null);
          setSelectedDocId(docSnap.id);
        } else {
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

  const decreaseQty = () => setQuantity((q) => Math.max(1, q - 1));
  const increaseQty = () =>
    setQuantity((q) => {
      const max = typeof selectedStock === "number" ? selectedStock : 99;
      return Math.min(max, q + 1);
    });

  const handleAddToCart = async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to add selections.");
    if (!product?.id) return alert("Product data not ready.");

    if (sizes.length > 0 && !selectedSize)
      return alert("Please select a size first.");

    if (!selectedPrice && selectedPrice !== 0)
      return alert("Price not available.");

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
        productName: `${passedBrand || product.brand || ""} ${
          passedModel || product.model || ""
        } (${selectedSize})`,
        brand: passedBrand || product.brand || "Unknown",
        model: passedModel || product.model || "",
        selectedSize,
        selectedDocId,
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
    if (sizes.length > 0 && !selectedSize)
      return alert("Select a size first.");

    if (!selectedPrice && selectedPrice !== 0)
      return alert("Price not available.");

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

  const fallbackImage =
    mainImage || "https://placehold.co/300x300?text=No+Image";

  return (
    <div className="view-product">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="product-container">
        {/* LEFT IMAGE SECTION */}
        <div className="product-images">
          {hasGLB ? (
            <div className="ar-viewer-container">
              {!showAR ? (
                <ModelViewer modelUrl={modelUrl} />
              ) : (
                <ARViewer src={modelUrl} />
              )}
            </div>
          ) : (
            <img src={fallbackImage} alt="Main" className="main-image" />
          )}
        </div>

        {/* RIGHT INFO */}
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
            ₱
            {(
              selectedPrice ??
              product.retail ??
              product.price ??
              0
            ).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
            /unit
          </p>

          {/* Quantity */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label style={{ display: "block", fontSize: 14 }}>Quantity</label>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={decreaseQty} className="qty-btn">
                  -
                </button>
                <div style={{ minWidth: 36, textAlign: "center" }}>
                  {quantity}
                </div>
                <button onClick={increaseQty} className="qty-btn">
                  +
                </button>
              </div>
              {typeof selectedStock === "number" && (
                <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                  Stock: {selectedStock}
                </div>
              )}
            </div>
          </div>

          {/* Size selector */}
          {sizes.length > 0 && (
            <div className="size-selector" style={{ marginBottom: 12 }}>
              <label style={{ display: "block", marginBottom: 6 }}>
                Select Size:
              </label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
              > 
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
            Total ({quantity} item{quantity > 1 ? "s" : ""}): ₱
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
              disabled={
                // NEW LOGIC
                sizes.length > 0
                  ? !selectedSize
                  : !selectedPrice && selectedPrice !== 0
              }
            >
              Reserve Now
            </button>

            <button
              className="icon-button"
              onClick={handleAddToCart}
              title="Add to My Selections"
              disabled={
                sizes.length > 0
                  ? !selectedSize
                  : !selectedPrice && selectedPrice !== 0
              }
            >
              <FiShoppingCart size={24} />
            </button>
          </div>

          {showAR && (
            <button
              className="exit-ar-button"
              onClick={() => setShowAR(false)}
            >
              Exit AR Mode
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewProduct;
