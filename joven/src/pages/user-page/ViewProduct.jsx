// src/pages/user-page/ViewProduct.jsx
import React, { useEffect, useState } from "react";
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
import Navbar from "../../components/Navbar";

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
    year = "",
    vehicleLabel = "",
    fitment = null,
  } = location.state || {};

  /* ================================
     STATE
  ================================= */
  const [product, setProduct] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [modelUrl, setModelUrl] = useState(null);

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [showDescription, setShowDescription] = useState(false);

  const [quantity, setQuantity] = useState(1);

  const [stockError, setStockError] = useState("");


  /* ================================
     HELPERS
  ================================= */
  const getCollectionName = (productId) => {
    if (!productId) return null;
    if (productId.startsWith("TI-")) return "products_tires";
    if (productId.startsWith("MA-")) return "products_mags";
    return null;
  };

  /* ================================
     FETCH PRODUCT
  ================================= */
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const collectionName = getCollectionName(id);
        let docSnap;

        if (!collectionName) {
          docSnap = await getDoc(doc(db, "products_tires", id));
          if (!docSnap.exists()) {
            docSnap = await getDoc(doc(db, "products_mags", id));
          }
        } else {
          docSnap = await getDoc(doc(db, collectionName, id));
        }

        if (!docSnap.exists()) return;

        const data = docSnap.data();
        setProduct({ ...data, id: docSnap.id });

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

        if (sizes.length === 0) {
          setSelectedPrice(data.retail ?? data.price ?? null);
          setSelectedStock(data.stock ?? null);
        }

        setQuantity(1);
      } catch (err) {
        console.error("❌ Error fetching product:", err);
      }
    };

    fetchProduct();
  }, [id, sizes.length]);

  /* ================================
     CHECK GLB MODEL
  ================================= */
  useEffect(() => {
    const checkModel = async () => {
      if (!id) return;

      const urls = [
        `${SUPABASE_BASE_URL}/${id}.glb`,
        `${SUPABASE_BASE_URL}/${id}.GLB`,
      ];

      for (const url of urls) {
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

  /* ================================
     DERIVED VALUES (IMPORTANT FIX)
  ================================= */
  const productType = product ? getCollectionName(product.id) : null;

  const formattedSizes =
    productType === "products_mags"
      ? product
        ? [
            {
              size: `${product.wheelDiameter}x${product.wheelWidth} ${product.boltPattern}`,
              price: product.price ?? product.cost,
              stock: product.stock,
              docId: product.id,
            },
          ]
        : []
      : sizes;

  /* ================================
     AUTO SELECT SIZE FROM FITMENT
  ================================= */
  useEffect(() => {
    if (selectedSize) return;
    if (!fitment?.size || !formattedSizes.length) return;

    const match = formattedSizes.find(
      (s) => s.size === fitment.size
    );

    if (match) {
      setSelectedSize(match.size);
    }
  }, [fitment, formattedSizes, selectedSize]);

  /* ================================
     SIZE-SPECIFIC PRICE
  ================================= */
  useEffect(() => {
    if (!selectedSize) return;

    const selectedObj = formattedSizes.find(
      (s) => s.size === selectedSize
    );

    if (!selectedObj) return;

    setSelectedPrice(selectedObj.price ?? product?.price);
    const safeStock = Math.max(0, selectedObj.stock ?? product?.stock ?? 0);
      setSelectedStock(safeStock);

    setSelectedDocId(selectedObj.docId ?? product?.id);

      if (safeStock === 0) {
    setStockError("❌ Out of stock – unable to reserve or add to cart");
  } else {
    setStockError("");
  }

  }, [selectedSize, formattedSizes, product]);

  /* ================================
     QUANTITY
  ================================= */
  const decreaseQty = () => {
    setQuantity((q) => Math.max(1, q - 1));
  };

  const increaseQty = () => {
    const max = typeof selectedStock === "number" ? Math.max(0, selectedStock) : 0;
    setQuantity((q) => Math.min(max, q + 1));
  };

  /* ================================
     CART
  ================================= */
  const handleAddToCart = async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");

      if (selectedStock === 0) {
    setStockError("❌ Out of stock – unable to add to cart");
    return;
  }

    if (formattedSizes.length && !selectedSize)
      return alert("Please select a size first.");

    const cartRef = collection(db, "cartSelections");

    const q = query(
      cartRef,
      where("userId", "==", user.uid),
      where("productId", "==", product.id),
      where("selectedSize", "==", selectedSize)
    );

    const existing = await getDocs(q);
    if (!existing.empty)
      return alert("Item already in My Selections.");

    await addDoc(cartRef, {
      userId: user.uid,
      productId: product.id,
      productName: `${passedBrand || product.brand} ${
        passedModel || product.model
      } (${selectedSize})`,
      brand: passedBrand || product.brand,
      model: passedModel || product.model,
      selectedSize,
      selectedDocId,
      pricePerItem: selectedPrice,
      quantity,
      totalPrice: selectedPrice * quantity,
      createdAt: serverTimestamp(),
      vehicleLabel,
      collection: productType,
    });

    alert("✔ Added to My Selections!");
  };

  /* ================================
     RESERVE / AR
  ================================= */
  const handleReserveClick = () => {
      if (selectedStock === 0) {
    setStockError("❌ Out of stock – unable to reserve");
    return;
  }

    if (formattedSizes.length && !selectedSize)
      return alert("Select a size first.");

    navigate(`/reservation/${product.id}`, {
      state: {
        vehicleLabel,
        year,
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

  navigate(`/ar/basic/${product.id}`, {
    state: {
      modelUrl,
      modelRotation: product.modelRotation || "0deg 0deg 0deg",
      modelScale: product.modelScale || "1 1 1",
    },
  });
};

  /* ================================
     EARLY RETURN
  ================================= */
  if (!product) {
    return <div className="view-product">Loading product…</div>;
  }

  const hasGLB = !!modelUrl;
  const fallbackImage =
    mainImage || "https://placehold.co/300x300?text=No+Image";

  /* ================================
     JSX
  ================================= */
  return (
    <div className="view-product-page">
      <Navbar />

      <div className="view-product">

        <div className="product-container">
           <button className="back-button" onClick={() => navigate(-1)}>
          ← Back
        </button>
          <div className="product-images">
            {hasGLB ? (
              <ModelViewer modelUrl={modelUrl} />
            ) : (
              <img src={fallbackImage} alt="Main" className="main-image" />
            )}
          </div>

          <div className="product-info">
            {vehicleLabel && (
              <div className="fitment-context">
                🚗 Fitment for: <strong>{vehicleLabel}</strong>
              </div>
            )}

        <span className="tag">NEW</span>
        <h2 className="product-brand">{passedBrand || product.brand}</h2>
        <h1 className="product-model">{passedModel || product.model}</h1>

        {/* Total Price */}
        <div className="total-price">
          Total ({quantity} item{quantity > 1 ? "s" : ""}): ₱
          {(selectedPrice * quantity).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>

        {/* SELECT SIZE (RIGHT AFTER TOTAL PRICE) */}
        {formattedSizes.length > 0 && (
          <select
            value={selectedSize}
            onChange={(e) => setSelectedSize(e.target.value)}
          >
            <option value="">Choose a size</option>
            {formattedSizes.map((s, i) => (
              <option key={i} value={s.size}>
                {s.size}
              </option>
            ))}
          </select>
        )}

        {/* Price per piece/set */}
        <p className="price">
          ₱{(selectedPrice ?? 0).toLocaleString()}
          <span>{productType === "products_mags" ? "/set" : "/piece"}</span>
        </p>

        {/* Quantity */}
        <div className="quantity-wrapper">
          <div>
            <label className="quantity-label">
              {productType === "products_mags"
                ? "Quantity (per set)"
                : "Quantity (per piece)"}
            </label>

            <div className="quantity-controls">
              <button onClick={decreaseQty} className="qty-btn">
                -
              </button>

              <div className="quantity-display">{quantity}</div>

              <button onClick={increaseQty} className="qty-btn">
                +
              </button>
            </div>

            {typeof selectedStock === "number" && selectedStock > 0 && (
              <div className="stock-info">Stock: {selectedStock}</div>
            )}
          </div>
        </div>

        {/* Stock error */}
        {stockError && <p className="stock-error">{stockError}</p>}

        {/* PRODUCT DESCRIPTION (DROPDOWN) BELOW STOCK ERROR */}
        {product.description && (
          <div className="description-wrapper">
            <button
              className="description-toggle"
              onClick={() => setShowDescription((prev) => !prev)}
            >
              Product Description
              <span className={`arrow ${showDescription ? "open" : ""}`}>▼</span>
            </button>

            {showDescription && (
              <p className="product-description">{product.description}</p>
            )}
          </div>
        )}

        <div className="button-row">
          {hasGLB && (
            <button className="ar-button" onClick={handleARClick}>
              Visualize it in your vehicle
            </button>
          )}

          <button
            className="reserve-button"
            onClick={handleReserveClick}
            disabled={selectedStock === 0}
          >
            Reserve Now
          </button>

          <button
            className="icon-button"
            onClick={handleAddToCart}
            disabled={selectedStock === 0}
            title={selectedStock === 0 ? "Out of stock" : "Add to cart"}
          >
            <FiShoppingCart size={24} />
          </button>
        </div>


          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProduct;
