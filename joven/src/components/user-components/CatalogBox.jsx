// src/components/CatalogBox.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase"; 
import "../../styles/CatalogBox.css"; 

const CatalogBox = ({ filters }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { size: fitmentSizes = [], vehicleLabel = "" } = location.state || {};

  const [products, setProducts] = useState([]);
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));
        const fetched = snapshot.docs.map((doc) => {
          const data = doc.data();
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

  // 🔹 Parse product size object
  const parseProductSize = (product) => {
    if (!product) return null;
    if (product.overallDiameter && product.sectionWidth && product.rimDiameter) {
      return {
        type: "flotation",
        overallDiameter: String(product.overallDiameter),
        sectionWidth: String(product.sectionWidth),
        rimDiameter: String(product.rimDiameter),
      };
    }
    if (product.width && product.rimDiameter) {
      return {
        type: "metric",
        width: String(product.width),
        aspectRatio: product.aspectRatio ? String(product.aspectRatio) : null,
        rimDiameter: String(product.rimDiameter),
      };
    }
    return null;
  };

  // 🔹 Parse fitment size string
  const parseFitmentSize = (sizeStr) => {
    if (!sizeStr) return null;
    let match = sizeStr.match(/^(\d{3})\/(\d{2,3})R(\d{2}(?:\.\d)?)$/i);
    if (match) return { type: "metric", width: match[1], aspectRatio: match[2], rimDiameter: match[3] };
    match = sizeStr.match(/^(\d{3})R(\d{2}(?:\.\d)?)$/i);
    if (match) return { type: "metric", width: match[1], aspectRatio: null, rimDiameter: match[2] };
    match = sizeStr.match(/^(\d+)\s*X\s*([\d.]+)\s*R(\d+)$/i);
    if (match) return { type: "flotation", overallDiameter: match[1], sectionWidth: match[2], rimDiameter: match[3] };
    return null;
  };

  // 🔹 Compare product and fitment
  const isSizeMatch = (spec, f) => {
    if (!spec || !f || spec.type !== f.type) return false;
    if (spec.type === "metric") {
      return (
        String(spec.width) === String(f.width) &&
        (String(spec.aspectRatio) === String(f.aspectRatio) || !spec.aspectRatio || !f.aspectRatio) &&
        String(spec.rimDiameter) === String(f.rimDiameter)
      );
    }
    if (spec.type === "flotation") {
      return (
        String(spec.overallDiameter) === String(f.overallDiameter) &&
        String(spec.sectionWidth) === String(f.sectionWidth) &&
        String(spec.rimDiameter) === String(f.rimDiameter)
      );
    }
    return false;
  };

  // 🔹 Filter + sort products
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

    // Fitment filter (vehicle input)
    if (fitmentSizes.length > 0) {
      const fitmentSpecs = fitmentSizes.map(parseFitmentSize).filter(Boolean);
      result = result.filter((product) => {
        const productSizes = Array.isArray(product.size) ? product.size : [product.size];
        return productSizes.some((psize) => {
          const parsedSpec = parseFitmentSize(psize) || parseProductSize(product);
          return fitmentSpecs.some((f) => isSizeMatch(parsedSpec, f));
        });
      });
    }

    // Sorting
    switch (sortOption) {
      case "name-asc":
        return result.sort((a, b) => (a.brand || "").localeCompare(b.brand || ""));
      case "name-desc":
        return result.sort((a, b) => (b.brand || "").localeCompare(a.brand || ""));
      case "price-asc":
        return result.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
      case "price-desc":
        return result.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
      default:
        return result;
    }
  }, [products, filters, fitmentSizes, sortOption]);

  // Pagination
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIdx, startIdx + itemsPerPage);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleView = (id) => navigate(`/view-product/${id}`);

  return (
    <div className="catalog">
      <div className="catalog-header">
        <h3>
          Product Catalog {vehicleLabel && <span className="vehicle-label">for {vehicleLabel}</span>}
        </h3>
        <select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="sort-select">
          <option value="default">Sort by</option>
          <option value="name-asc">Brand (A–Z)</option>
          <option value="name-desc">Brand (Z–A)</option>
          <option value="price-asc">Price (Low to High)</option>
          <option value="price-desc">Price (High to Low)</option>
        </select>
      </div>

      <div className="product-grid">
        {paginatedProducts.length === 0 ? (
          <p className="no-products">No products available.</p>
        ) : (
          paginatedProducts.map((product, idx) => {
            const { id, imageUrl, brand, model, pattern, size, loadRating, plyRating, price, description, reviews = [], new: isNew } = product;

            const productSizes = Array.isArray(size) ? size : [size];
            const fitmentSpecs = fitmentSizes.map(parseFitmentSize).filter(Boolean);
            const isFitmentMatch = productSizes.some((psize) => {
              const parsedSpec = parseFitmentSize(psize) || parseProductSize(product);
              return fitmentSpecs.some((f) => isSizeMatch(parsedSpec, f));
            });

            return (
              <div key={id || idx} className="product-card" onClick={() => handleView(id)}>
                {isNew && <div className="tag">NEW</div>}
                {fitmentSizes.length > 0 && isFitmentMatch && <div className="tag fitment-tag">FITMENT MATCH</div>}
                <img
                  src={imageUrl || "https://placehold.co/150x150?text=No+Image"}
                  alt={`${brand || "Brand"} ${model || "Model"}`}
                  className="product-img"
                  onError={(e) => (e.target.src = "https://placehold.co/150x150?text=No+Image")}
                />
                <h4 className="product-name">{brand || "Unknown Brand"}</h4>
                <p className="product-model-size">{size} {model} {pattern}</p>
                <p className="product-extra">{loadRating && `Load: ${loadRating} `}{plyRating && `| Ply: ${plyRating}`}</p>
                <p className="product-price">₱{price?.toLocaleString() || "N/A"}</p>
                <p className="product-desc">{description}</p>
                <div className="product-rating">
                  ★★★★☆ ({reviews.length || 1} Review{reviews.length > 1 ? "s" : ""})
                </div>
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
