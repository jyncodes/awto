// src/components/user-components/CatalogBox.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import ModelViewer from "./ModelViewer"; // ✅ Added 3D Model Viewer
import "../../styles/CatalogBox.css";

const CatalogBox = ({ filters }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Safely receive fitment data (from Manual.jsx)
  const {
    size: fitmentSizes = [],
    vehicleLabel = "",
    fitment = {}, // { type, boltPattern, offset, width, rimDiameter, aspectRatio }
  } = location.state || {};

  const [products, setProducts] = useState([]);
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);

  // ✅ Pagination constant
  const itemsPerPage = 12;

  // 🔹 Fetch products from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));
        const fetched = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Generate size string if missing
          let size = data.size;
          if (!size && data.width && data.rimDiameter) {
            size = data.aspectRatio
              ? `${data.width}/${data.aspectRatio}R${data.rimDiameter}`
              : `${data.width}R${data.rimDiameter}`;
          }

          return { id: doc.id, ...data, size };
        });

        setProducts(fetched);
      } catch (error) {
        console.error("❌ Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  // 🔹 Parse tire size string (e.g., 215/50R17 or 215R17)
  const parseFitmentSize = (sizeStr) => {
    if (!sizeStr) return null;
    let match = sizeStr.match(/^(\d{3})\/(\d{2,3})R(\d{2}(?:\.\d)?)$/i);
    if (match) return { width: match[1], aspectRatio: match[2], rimDiameter: match[3] };
    match = sizeStr.match(/^(\d{3})R(\d{2}(?:\.\d)?)$/i);
    if (match) return { width: match[1], aspectRatio: null, rimDiameter: match[2] };
    return null;
  };

  // 🔹 Filter + sort logic
  const filteredProducts = useMemo(() => {
    let result = Array.isArray(products) ? [...products] : [];

    // ✅ Apply custom filters
    if (filters && Object.keys(filters).length > 0) {
      result = result.filter((product) =>
        Object.entries(filters).every(([key, values]) => {
          const value = (product[key] || "").toString().toLowerCase();
          return values.some((v) => value.includes(v.toLowerCase()));
        })
      );
    }

    // ✅ Apply fitment filtering (size, bolt pattern, offset, etc.)
    if ((fitmentSizes && fitmentSizes.length > 0) || Object.keys(fitment).length > 0) {
      const fitmentSpecs = (fitmentSizes || []).map(parseFitmentSize).filter(Boolean);

      result = result.filter((product) => {
        // 🔸 Tires
        if (fitment.type?.toLowerCase() === "tire" && product.type?.toLowerCase() === "tire") {
          return (
            (!fitment.width ||
              product.width?.toString() === fitment.width?.toString()) &&
            (!fitment.aspectRatio ||
              product.aspectRatio?.toString() === fitment.aspectRatio?.toString()) &&
            (!fitment.rimDiameter ||
              product.rimDiameter?.toString() === fitment.rimDiameter?.toString())
          );
        }

        // 🔸 Wheels or mags
        if (
          fitment.type?.toLowerCase() === "wheel" &&
          (product.type?.toLowerCase() === "wheel" ||
            product.type?.toLowerCase() === "mags")
        ) {
          return (
            (!fitment.rimDiameter ||
              product.rimDiameter?.toString() === fitment.rimDiameter?.toString()) &&
            (!fitment.boltPattern ||
              product.pcd?.toString().toLowerCase() ===
                fitment.boltPattern?.toString().toLowerCase()) &&
            (!fitment.offset ||
              product.et?.toString().toLowerCase() ===
                fitment.offset?.toString().toLowerCase())
          );
        }

        return true;
      });
    }

    // ✅ Sorting
    switch (sortOption) {
      case "name-asc":
        return result.sort((a, b) => (a.brand || "").localeCompare(b.brand || ""));
      case "name-desc":
        return result.sort((a, b) => (b.brand || "").localeCompare(a.brand || ""));
      case "price-asc":
        return result.sort(
          (a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0)
        );
      case "price-desc":
        return result.sort(
          (a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0)
        );
      default:
        return result;
    }
  }, [products, filters, fitment, sortOption, fitmentSizes]);

  // ✅ Pagination logic
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIdx, startIdx + itemsPerPage);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // ✅ Handle product view
  const handleView = (id) => navigate(`/view-product/${id}`, { state: location.state });

  return (
    <div className="catalog">
      <div className="catalog-header">
        <h3>
          Product Catalog{" "}
          {vehicleLabel && (
            <span className="vehicle-label">for {vehicleLabel}</span>
          )}
        </h3>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="sort-select"
        >
          <option value="default">Sort by</option>
          <option value="name-asc">Brand (A–Z)</option>
          <option value="name-desc">Brand (Z–A)</option>
          <option value="price-asc">Price (Low → High)</option>
          <option value="price-desc">Price (High → Low)</option>
        </select>
      </div>

      <div className="product-grid">
        {paginatedProducts.length === 0 ? (
          <p className="no-products">
            ⚠️ No products matched your filters. Try removing filters or changing your fitment.
          </p>
        ) : (
          paginatedProducts.map((product) => {
            const hasGLB = product.modelUrl || (product.productId && product.type === "Mags");

            const modelUrl = product.modelUrl
              ? product.modelUrl.startsWith("/")
                ? product.modelUrl
                : `/${product.modelUrl}`
              : product.productId && product.type === "Mags"
              ? `/models/mags/${product.productId}.glb`
              : "";

            return (
              <div
                key={product.id}
                className="product-card"
                onClick={() => handleView(product.id)}
              >
                {fitment && Object.keys(fitment).length > 0 && (
                  <div className="tag fitment-tag">FITMENT MATCH</div>
                )}

                {/* ✅ 3D Model Viewer */}
                {hasGLB && modelUrl ? (
                  <div className="model-preview">
                    <ModelViewer modelUrl={modelUrl} />
                  </div>
                ) : (
                  <img
                    src={product.imageUrl || "https://placehold.co/150x150?text=No+Image"}
                    alt={`${product.brand || "Brand"} ${product.model || "Model"}`}
                    className="product-img"
                    onError={(e) =>
                      (e.target.src = "https://placehold.co/150x150?text=No+Image")
                    }
                  />
                )}

                <h4 className="product-name">{product.brand || "Unknown Brand"}</h4>
                <p className="product-model-size">
                  {product.size} {product.model} {product.pattern}
                </p>
                <p className="product-price">
                  ₱{product.price?.toLocaleString() || "N/A"}
                </p>
              </div>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={`page-${i + 1}`}
              className={`page-btn ${currentPage === i + 1 ? "active" : ""}`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CatalogBox;
