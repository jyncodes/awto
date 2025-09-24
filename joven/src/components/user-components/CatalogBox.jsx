// src/components/CatalogBox.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase"; 
import "../../styles/CatalogBox.css"; 

const CatalogBox = ({ filters }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Receive fitment data (sizes + specs from Manual.jsx)
  const {
    size: fitmentSizes = [],
    vehicleLabel = "",
    fitment = null, // { boltPattern, offset, wheelSize }
  } = location.state || {};

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

  // 🔹 Parse fitment size string
  const parseFitmentSize = (sizeStr) => {
    if (!sizeStr) return null;
    let match = sizeStr.match(/^(\d{3})\/(\d{2,3})R(\d{2}(?:\.\d)?)$/i);
    if (match) return { width: match[1], aspectRatio: match[2], rimDiameter: match[3] };
    match = sizeStr.match(/^(\d{3})R(\d{2}(?:\.\d)?)$/i);
    if (match) return { width: match[1], aspectRatio: null, rimDiameter: match[2] };
    return null;
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

    // ✅ Fitment filter (size + boltPattern + offset + wheelSize)
    if (fitmentSizes.length > 0 || fitment) {
      const fitmentSpecs = fitmentSizes.map(parseFitmentSize).filter(Boolean);

      result = result.filter((product) => {
        const productSizes = Array.isArray(product.size) ? product.size : [product.size];
        const sizeMatch =
          fitmentSpecs.length === 0 ||
          productSizes.some((psize) => {
            const parsedSpec = parseFitmentSize(psize);
            return fitmentSpecs.some(
              (f) =>
                f.width === parsedSpec?.width &&
                f.rimDiameter === parsedSpec?.rimDiameter &&
                (!f.aspectRatio || f.aspectRatio === parsedSpec?.aspectRatio)
            );
          });

        const boltMatch = !fitment?.boltPattern || product.boltPattern === fitment.boltPattern;
        const offsetMatch = !fitment?.offset || product.offset === fitment.offset;
        const wheelMatch = !fitment?.wheelSize || product.wheelSize === fitment.wheelSize;

        return sizeMatch && boltMatch && offsetMatch && wheelMatch;
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
  }, [products, filters, fitmentSizes, fitment, sortOption]);

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
          paginatedProducts.map((product) => (
            <div key={product.id} className="product-card" onClick={() => handleView(product.id)}>
              {fitment && <div className="tag fitment-tag">FITMENT MATCH</div>}
              <img
                src={product.imageUrl || "https://placehold.co/150x150?text=No+Image"}
                alt={`${product.brand || "Brand"} ${product.model || "Model"}`}
                className="product-img"
                onError={(e) => (e.target.src = "https://placehold.co/150x150?text=No+Image")}
              />
              <h4 className="product-name">{product.brand || "Unknown Brand"}</h4>
              <p className="product-model-size">
                {product.size} {product.model} {product.pattern}
              </p>
              <p className="product-price">₱{product.price?.toLocaleString() || "N/A"}</p>
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
