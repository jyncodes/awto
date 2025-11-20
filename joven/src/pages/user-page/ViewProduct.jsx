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
import ARSmartViewer from "../../components/user-components/ARSmartViewer";

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

  // FETCH PRODUCT FROM FIRESTORE
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
        }
      } catch (err) {
        console.error("❌ Error fetching product:", err);
      }
    };

    fetchProduct();
  }, [id]);

  // CHECK SUPABASE MODEL (.glb)
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
          continue;
        }
      }

      console.warn(`⚠️ No GLB model found for ${id}`);
      setModelUrl(null);
    };

    checkModel();
  }, [id]);

  // ADD TO CART
  const handleAddToCart = async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in to add selections.");
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
        return alert("Item already in My Selections.");
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
        collection: getCollectionName(product.productId || product.id),
      });

      alert("✔ Added to My Selections!");
    } catch (err) {
      console.error("Add to cart error:", err);
      alert("Failed to add. Try again.");
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
      alert("⚠ No 3D model found.");
      return;
    }
    setShowAR(true);
  };

  if (!product)
    return <div className="view-product">Loading product…</div>;

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
        {/* Left Section: Model / Image */}
        <div className="product-images">
          {hasGLB ? (
            <div className="ar-viewer-container">
              {!showAR ? (
                <ModelViewer modelUrl={modelUrl} />
              ) : (
                <ARSmartViewer src={modelUrl} viewerRef={arViewerRef} />
              )}
            </div>
          ) : (
            <img
              src={mainImage || "https://placehold.co/300x300?text=No+Image"}
              alt="Main"
              className="main-image"
            />
          )}

          {product.images?.length > 0 && (
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

        {/* Right Section: Product Details */}
        <div className="product-info">
          {vehicleLabel && (
            <div className="fitment-context">
              🚗 Fitment for: <strong>{vehicleLabel}</strong>
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
