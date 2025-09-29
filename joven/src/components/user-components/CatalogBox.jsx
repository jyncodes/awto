// src/components/CatalogBox.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/CatalogBox.css";

const ITEMS_PER_PAGE = 8;

const CatalogBox = ({ filters }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Get fitment info from Manual.jsx
  const {
    fitment = null, // { type: "tire"|"wheel", width, aspectRatio, rimDiameter, size }
    vehicleLabel = "",
  } = location.state || {};

  const [products, setProducts] = useState([]);
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);

  // 🔹 Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));
        const fetched = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Normalize tire size
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

  // 🔹 Apply filtering + sorting
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Sidebar filters
    if (filters && Object.keys(filters).length > 0) {
      result = result.filter((product) =>
        Object.entries(filters).every(([key, values]) => {
          const value = (product[key] || "").toString().toLowerCase();
          return values.some((v) => value.includes(v.toLowerCase()));
        })
      );
    }

    // ✅ Manual fitment filtering
    if (fitment) {
      result = result.filter((product) => {
        // 🔸 Tires
        if (fitment.type === "tire" && product.type?.toLowerCase() === "tire") {
          return (
            (!fitment.width ||
              product.width?.toString() === fitment.width?.toString()) &&
            (!fitment.aspectRatio ||
              product.aspectRatio?.toString() ===
                fitment.aspectRatio?.toString()) &&
            (!fitment.rimDiameter ||
              product.rimDiameter?.toString() ===
                fitment.rimDiameter?.toString())
          );
        }

        // 🔸 Wheels
        if (
          fitment.type === "wheel" &&
          (product.type?.toLowerCase() === "wheel" ||
            product.type?.toLowerCase() === "mags")
        ) {
          return (
            (!fitment.rimDiameter ||
              product.rimDiameter?.toString() ===
                fitment.rimDiameter?.toString()) &&
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

    // Sorting
    switch (sortOption) {
      case "name-asc":
        return result.sort((a, b) =>
          (a.brand || "").localeCompare(b.brand || "")
        );
      case "name-desc":
        return result.sort((a, b) =>
          (b.brand || "").localeCompare(a.brand || "")
        );
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
  }, [products, filters, fitment, sortOption]);

  // Pagination
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(
    startIdx,
    startIdx + ITEMS_PER_PAGE
  );
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  // View product
  const handleView = (id) =>
    navigate(`/view-product/${id}`, { state: { fitment } });

  return (
    <div className="catalog">
      <div className="catalog-header">
        <h3>
          Catalog{" "}
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
            ⚠️ No products matched your filters. Try removing filters.
          </p>
        ) : (
          paginatedProducts.map((product) => (
            <div
              key={product.id}
              className="product-card"
              onClick={() => handleView(product.id)}
            >
              {fitment && <div className="tag fitment-tag">FITMENT MATCH</div>}
              <img
                src={
                  product.imageUrl ||
                  "https://placehold.co/150x150?text=No+Image"
                }
                alt={`${product.brand || "Brand"} ${product.model || "Model"}`}
                className="product-img"
                onError={(e) =>
                  (e.target.src =
                    "https://placehold.co/150x150?text=No+Image")
                }
              />
              <h4 className="product-name">{product.brand || "Unknown"}</h4>
              <p className="product-model-size">
                {product.model} {product.size || product.rimDiameter}
              </p>
              <p className="product-price">
                ₱{product.price?.toLocaleString() || "N/A"}
              </p>
            </div>
          ))
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
