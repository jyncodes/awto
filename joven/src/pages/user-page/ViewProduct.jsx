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
import ARViewer from "../../components/user-components/ARViewer";
import ModelViewer from "../../components/user-components/ModelViewer";

const SUPABASE_BASE_URL =
  "https://ojyapkmalpnfwskpozbx.supabase.co/storage/v1/object/public/models";

const SUPABASE_IMAGE_URL =
  "https://ojyapkmalpnfwskpozbx.supabase.co/storage/v1/object/public/images";

const ViewProduct = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { vehicleLabel = "", size: fitmentSizes = [] } = location.state || {};

  const [product, setProduct] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [showAR, setShowAR] = useState(false);
  const [modelUrl, setModelUrl] = useState(null);
  const arViewerRef = useRef(null);

  const getCollectionName = (productId) => {
    if (!productId) return null;
    if (productId.startsWith("TI-")) return "products_tires";
    if (productId.startsWith("MA-")) return "products_mags";
    return null;
  };

  // Fetch product
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const collectionName = getCollectionName(id);

        if (!collectionName) {
          const tiresRef = doc(db, "products_tires", id);
          const magsRef = doc(db, "products_mags", id);
          let docSnap = await getDoc(tiresRef);
          if (!docSnap.exists()) docSnap = await getDoc(magsRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setProduct({ ...data, id: docSnap.id });
            setMainImage(`${SUPABASE_IMAGE_URL}/${id}.jpg`);
          }
          return;
        }

        const docRef = doc(db, collectionName, id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setProduct({ ...data, id: docSnap.id });
          setMainImage(`${SUPABASE_IMAGE_URL}/${id}.jpg`);
        }
      } catch (error) {
        console.error("❌ Error fetching product:", error);
      }
    };
    fetchProduct();
  }, [id]);

  // Check model exists
  useEffect(() => {
    const checkModel = async () => {
      if (!id) return;

      const possiblePaths = [
        `${SUPABASE_BASE_URL}/${id}.glb`,
        `${SUPABASE_BASE_URL}/${id}.GLB`,
        `${SUPABASE_BASE_URL}/products_tires/${id}.glb`,
        `${SUPABASE_BASE_URL}/products_tires/${id}.GLB`,
        `${SUPABASE_BASE_URL}/products_mags/${id}.glb`,
        `${SUPABASE_BASE_URL}/products_mags/${id}.GLB`,
      ];

      for (const url of possiblePaths) {
        try {
          const res = await fetch(url, { method: "HEAD" });
          if (res.ok) {
            setModelUrl(url);
            return;
          }
        } catch {
          continue;
        }
      }

      console.warn(`⚠️ No GLB model found for ${id} in Supabase`);
      setModelUrl(null);
    };

    checkModel();
  }, [id]);

  const handleAddToCart = async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to add to selections.");
    if (!product?.id) return alert("Product data not ready.");

    try {
      const cartRef = collection(db, "cartSelections");
      const q = query(
        cartRef,
        where("userId", "==", user.uid),
        where("productId", "==", product.id)
      );
      const existing = await getDocs(q);

      if (!existing.empty) {
        return alert("Item is already in your selections.");
      }

      await addDoc(cartRef, {
        userId: user.uid,
        productId: product.id,
        productName:
          product.name ||
          `${product.size || ""} ${product.model || ""}`.trim() ||
          "Unnamed Product",
        brand: product.brand || "Unknown",
        price: typeof product.price === "number" ? product.price : 0,
        createdAt: serverTimestamp(),
        vehicleLabel: vehicleLabel || null,
        collection:
          getCollectionName(product.productId || product.id) || "unknown",
      });

      alert("✅ Added to My Selections!");
    } catch (error) {
      console.error("❌ Add to cart error:", error);
      alert("Failed to add to My Selections. Please try again.");
    }
  };

  const handleReserveClick = () => {
    if (product?.id) {
      navigate(`/reservation/${product.id}`, {
        state: { vehicleLabel, fitmentSizes, product },
      });
    }
  };

  const handleARClick = () => {
    if (!modelUrl) {
      alert("⚠️ Model not available for AR visualization.");
      return;
    }
    setShowAR(true);
  };

  if (!product)
    return <div className="view-product">Loading product details...</div>;

  const displayName =
    product.size && product.model
      ? `${product.size} ${product.model}`
      : product.name || "No Name";

  const hasGLB = !!modelUrl;

  return (
    <div className="view-product">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="product-container">
        <div className="product-images">

          {/* 🔧 FIXED AR + MODEL VIEWER TO PREVENT REMOUNT */}
          {hasGLB ? (
            <div className="ar-viewer-container">

              {/* ModelViewer stays mounted */}
              <div style={{ display: showAR ? "none" : "block" }}>
                <ModelViewer modelUrl={modelUrl} />
              </div>

              {/* ARViewer stays mounted */}
              <div style={{ display: showAR ? "block" : "none" }}>
                <ARViewer
                  src={modelUrl}
                  alt={displayName}
                  viewerRef={arViewerRef}
                />
              </div>

            </div>
          ) : (
            <img
              src={mainImage || "https://placehold.co/300x300?text=No+Image"}
              alt="Main"
              className="main-image"
            />
          )}

          {product.images && (
            <div className="thumbnail-row">
              {product.images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Thumbnail ${i + 1}`}
                  className={`thumbnail ${mainImage === img ? "active" : ""}`}
                  onClick={() => setMainImage(img)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="product-info">
          {vehicleLabel && (
            <div className="fitment-context">
              🚗 Showing fitment for: <strong>{vehicleLabel}</strong>
            </div>
          )}

          <span className="tag">NEW</span>
          <h2 className="brand-logo">{product.brand || "No Brand"}</h2>
          <h1 className="product-name">{displayName}</h1>
          <p className="price">₱{product.price?.toLocaleString() || "N/A"}</p>

          <details className="desc-section" open>
            <summary>Description</summary>
            <p>{product.description || "No description available."}</p>
          </details>

          <div className="button-row">
            {hasGLB && (
              <button className="ar-button" onClick={handleARClick}>
                Visualize it in your vehicle
              </button>
            )}

            <button className="reserve-button" onClick={handleReserveClick}>
              Reserve Now
            </button>

            <button
              className="icon-button"
              onClick={handleAddToCart}
              title="Add to My Selections"
            >
              <FiShoppingCart size={24} />
            </button>
          </div>

          {showAR && (
            <button
              className="exit-ar-button"
              onClick={() => setShowAR(false)}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                backgroundColor: "#eee",
                border: "1px solid #ccc",
                cursor: "pointer",
              }}
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
