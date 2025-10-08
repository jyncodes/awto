// src/components/user-components/CatalogBox.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import ModelViewer from "./ModelViewer";
import "../../styles/user-styles/CatalogBox.css";

const CatalogBox = ({ filters }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Get fitment/vehicle info from previous page
  const { size: fitmentSizes = [], vehicleLabel = "", fitment = {} } =
    location.state || {};

  const [products, setProducts] = useState([]);
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // ✅ Fetch Tire & Mag products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const collections = [
          { name: "Tire", ref: collection(db, "products_tires") },
          { name: "Mags", ref: collection(db, "products_mags") },
        ];

        const allProducts = [];

        for (const { name, ref } of collections) {
          const snapshot = await getDocs(ref);
          snapshot.forEach((doc) => {
            const data = doc.data();
            allProducts.push({
              id: doc.id,
              category: name,
              ...data,
              type: data.type || name,
              brand: data.brand || "Unbranded",
              model: data.model || "",
              price: data.price ? Number(data.price) : 0,
              size:
                data.size ||
                (data.tireWidth && data.rimDiameter
                  ? data.aspectRatio
                    ? `${data.tireWidth}/${data.aspectRatio}R${data.rimDiameter}`
                    : `${data.tireWidth}R${data.rimDiameter}`
                  : "Unknown"),
            });
          });
        }

        setProducts(allProducts);
      } catch (error) {
        console.error("❌ Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  // ✅ Parse tire size (e.g., 215/55R17)
  const parseFitmentSize = (sizeStr) => {
    if (!sizeStr) return null;
    let match = sizeStr.match(/^(\d{3})\/(\d{2,3})R(\d{2}(?:\.\d)?)$/i);
    if (match)
      return { width: match[1], aspectRatio: match[2], rimDiameter: match[3] };
    match = sizeStr.match(/^(\d{3})R(\d{2}(?:\.\d)?)$/i);
    if (match)
      return { width: match[1], aspectRatio: null, rimDiameter: match[2] };
    return null;
  };

  // ✅ Filter + Sort
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 🔍 Sidebar filters
    if (filters && Object.keys(filters).length > 0) {
      result = result.filter((product) =>
        Object.entries(filters).every(([key, values]) => {
          const value = (product[key] || "").toString().toLowerCase();
          return values.some((v) => value.includes(v.toLowerCase()));
        })
      );
    }

    // 🚘 Fitment filters
    if (fitmentSizes.length > 0 || Object.keys(fitment).length > 0) {
      const fitmentSpecs = fitmentSizes.map(parseFitmentSize).filter(Boolean);

      result = result.filter((product) => {
        if (
          fitment.type?.toLowerCase() === "tire" &&
          product.type?.toLowerCase() === "tire"
        ) {
          return (
            (!fitment.width ||
              product.tireWidth?.toString() === fitment.width?.toString()) &&
            (!fitment.aspectRatio ||
              product.aspectRatio?.toString() ===
                fitment.aspectRatio?.toString()) &&
            (!fitment.rimDiameter ||
              product.rimDiameter?.toString() ===
                fitment.rimDiameter?.toString())
          );
        }

        if (
          fitment.type?.toLowerCase() === "wheel" &&
          ["wheel", "mags"].includes(product.type?.toLowerCase())
        ) {
          return (
            (!fitment.rimDiameter ||
              product.rimDiameter?.toString() ===
                fitment.rimDiameter?.toString()) &&
            (!fitment.boltPattern ||
              product.boltPattern?.toString().toLowerCase() ===
                fitment.boltPattern?.toString().toLowerCase()) &&
            (!fitment.offset ||
              product.offset?.toString().toLowerCase() ===
                fitment.offset?.toString().toLowerCase())
          );
        }

        return true;
      });
    }

    // 🔄 Sorting
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
        return result.sort((a, b) => a.price - b.price);
      case "price-desc":
        return result.sort((a, b) => b.price - a.price);
      default:
        return result;
    }
  }, [products, filters, fitment, fitmentSizes, sortOption]);

  // ✅ Pagination
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(
    startIdx,
    startIdx + itemsPerPage
  );
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  // ✅ View product
  const handleView = (category, id) =>
    navigate(`/view-product/${id}`, {
      state: { ...location.state, category },
    });

  return (
    <div className="catalog">
      {/* Header + Sorting */}
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

      {/* Product Grid */}
      <div className="product-grid">
        {paginatedProducts.length === 0 ? (
          <p className="no-products">
            ⚠️ No products matched your filters. Try removing filters or
            adjusting fitment.
          </p>
        ) : (
          paginatedProducts.map((product) => {
            const hasGLB =
              product.modelUrl || (product.id && product.category === "Mags");
            const modelUrl = product.modelUrl
              ? product.modelUrl.startsWith("/")
                ? product.modelUrl
                : `/${product.modelUrl}`
              : product.category === "Mags"
              ? `/models/mags/${product.id}.glb`
              : "";

            return (
              <div
                key={product.id}
                className="product-card"
                onClick={() => handleView(product.category, product.id)}
              >
                {hasGLB && modelUrl ? (
                  <div className="model-preview">
                    <ModelViewer modelUrl={modelUrl} />
                  </div>
                ) : (
                  <img
                    src={
                      product.imageUrl ||
                      "https://placehold.co/150x150?text=No+Image"
                    }
                    alt={`${product.brand || "Brand"} ${
                      product.model || "Model"
                    }`}
                    className="product-img"
                    onError={(e) =>
                      (e.target.src =
                        "https://placehold.co/150x150?text=No+Image")
                    }
                  />
                )}

                <h4 className="product-name">{product.brand}</h4>
                <p className="product-model-size">
                  {product.size} {product.model}
                </p>
                <p className="product-price">
                  ₱{product.price?.toLocaleString() || "N/A"}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
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
