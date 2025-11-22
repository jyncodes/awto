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

  const [selectedSize, setSelectedSize] = useState("");
  const [selectedPrice, setSelectedPrice] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const increaseQty = () => {
    if (selectedStock && quantity < selectedStock) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQty = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const parseSize = (size) => {
    if (!size) return null;
    const regex = /^(\d{3})\/(\d{2})R?(\d{2})$/;
    const match = size.match(regex);
    if (!match) return null;

    return {
      tireWidth: parseInt(match[1]),
      aspectRatio: parseInt(match[2]),
      rimDiameter: parseInt(match[3]),
    };
  };

  const getCollectionName = (productId) => {
    if (!productId) return null;
    if (productId.startsWith("TI-")) return "products_tires";
    if (productId.startsWith("MA-")) return "products_mags";
    return null;
  };

  // FETCH PRODUCT
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

          const imgUrl = `${SUPABASE_IMAGE_URL}/${id}.jpg`;
          setMainImage(imgUrl);
        }
      } catch (error) {
        console.error("❌ Error fetching product:", error);
      }
    };
    fetchProduct();
  }, [id]);

  // CHECK GLB MODEL
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

  // FETCH SIZE DOCUMENT
  useEffect(() => {
    if (!selectedSize || !product) return;

    const fetchSizeDoc = async () => {
      try {
        const colName =
          getCollectionName(product.id) ||
          (product.type?.toLowerCase().includes("tire")
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

        let snap = await getDocs(q);

        if (snap.empty) {
          const parsed = parseSize(selectedSize);
          if (parsed) {
            const q2 = query(
              colRef,
              where("tireWidth", "==", parsed.tireWidth),
              where("rimDiameter", "==", parsed.rimDiameter),
              where("brand", "==", passedBrand || product.brand || ""),
              where("model", "==", passedModel || product.model || "")
            );
            snap = await getDocs(q2);
          }
        }

        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const data = docSnap.data();

          setSelectedPrice(data.price || null);
          setSelectedStock(data.stock || null);
          setSelectedDocId(docSnap.id);

          if (data.stock && quantity > data.stock) {
            setQuantity(data.stock);
          }
        } else {
          setSelectedPrice(product.price || null);
          setSelectedStock(product.stock || null);
          setSelectedDocId(null);
        }
      } catch (err) {
        console.error("Error fetching size doc:", err);
      }
    };

    fetchSizeDoc();
  }, [selectedSize, product]);

  const handleAddToCart = async () => {
    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");
    if (!selectedSize) return alert("Select a size.");

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
        return alert("Item already in My Selections.");
      }

      await addDoc(cartRef, {
        userId: user.uid,
        productId: product.id,
        productName: `${product.brand} ${product.model} (${selectedSize})`,
        selectedSize,
        pricePerItem: selectedPrice,
        quantity,
        totalPrice: selectedPrice * quantity,
        createdAt: serverTimestamp(),
      });

      alert("Added to My Selections!");
    } catch (e) {
      console.error(e);
      alert("Failed to add.");
    }
  };

  const handleReserveClick = () => {
    if (!selectedSize) return alert("Select a size first.");

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

  if (!product)
    return <div className="view-product">Loading product…</div>;

  const isTire =
    getCollectionName(product.id) === "products_tires" ||
    product.type?.toLowerCase().includes("tire");

  return (
    <div className="view-product">
      <button className="back-button" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <div className="product-container">
        <div className="product-images">
          {modelUrl ? (
            <div className="ar-viewer-container">
              {!showAR ? (
                <ModelViewer modelUrl={modelUrl} />
              ) : (
                <ARViewer src={modelUrl} />
              )}
            </div>
          ) : (
            <img
              src={
                mainImage || "https://placehold.co/300x300?text=No+Image"
              }
              alt="Main"
              className="main-image"
            />
          )}
        </div>

        <div className="product-info">
          {vehicleLabel && (
            <div className="fitment-context">
              🚗 Showing fitment for: <strong>{vehicleLabel}</strong>
            </div>
          )}

          <h2>
            {(passedBrand || product.brand) +
              " " +
              (passedModel || product.model)}
          </h2>

          <p className="price">
            {selectedPrice
              ? `₱${selectedPrice.toLocaleString()}`
              : `₱${product.price?.toLocaleString()}`}
          </p>

          <div>
            <label>Quantity</label>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={decreaseQty}>-</button>
              <div>{quantity}</div>
              <button onClick={increaseQty}>+</button>
            </div>
          </div>

          {sizes.length > 0 && (
            <div className="size-selector">
              <label>Select Size</label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
              >
                <option value="">Choose Size</option>
                {sizes.map((s, i) => (
                  <option key={i} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ fontWeight: 700, marginTop: 10 }}>
            Total:{" "}
            {selectedPrice
              ? `₱${(selectedPrice * quantity).toLocaleString()}`
              : "N/A"}
          </div>

          <div className="button-row">
            {modelUrl && (
              <button onClick={() => setShowAR(true)}>
                Visualize it in your vehicle
              </button>
            )}

            <button onClick={handleReserveClick}>
              {isTire ? "Reserve Tires" : "Reserve Wheel"}
            </button>

            <button onClick={handleAddToCart}>
              <FiShoppingCart size={24} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProduct;
