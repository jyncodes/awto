import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/CatalogBox.css";

const CatalogBox = ({ filters }) => {
  const navigate = useNavigate();
  const location = useLocation(); // 👈 get state from navigation
  const { size: fitmentSizes = [], vehicleLabel = "" } = location.state || {};

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sortOption, setSortOption] = useState("default");

  const itemsPerPage = 8;
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));
        const fetched = snapshot.docs.map((doc) => {
          const data = doc.data();

          // Compute size if not pre-generated
          let size = data.size;
          if (!size && data.width && data.aspectRatio && data.rimDiameter) {
            size = `${data.width}/${data.aspectRatio}R${data.rimDiameter}`;
          }

          return { id: doc.id, ...data, size };
        });
        setProducts(fetched);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };
    fetchProducts();
  }, []);

  // Parse tire size like "225/50R17"
  const parseTireSize = (sizeStr) => {
    const match = sizeStr?.match(/^(\d+)\/(\d+)R(\d+)$/);
    if (!match) return null;
    return {
      width: match[1],
      aspectRatio: match[2],
      rimDiameter: match[3],
    };
  };

  // Filter and sort
  useEffect(() => {
    let result = products;

    // 🔹 Apply filters from props (if any)
    if (filters && Object.keys(filters).length > 0) {
      result = result.filter((product) =>
        Object.entries(filters).every(([key, values]) => {
          const value = (product[key] || "").toString().toLowerCase();
          return values.some((v) => value.includes(v.toLowerCase()));
        })
      );
    }

    // 🔹 Apply fitment-based filtering
    if (fitmentSizes.length > 0) {
      const fitmentSpecs = fitmentSizes.map(parseTireSize).filter(Boolean);
      result = result.filter((product) => {
        if (!product.width || !product.aspectRatio || !product.rimDiameter) return false;
        return fitmentSpecs.some(
          (spec) =>
            product.width.toString() === spec.width &&
            product.aspectRatio.toString() === spec.aspectRatio &&
            product.rimDiameter.toString() === spec.rimDiameter
        );
      });
    }

    setFilteredProducts(sortProducts(result, sortOption));
    setCurrentPage(1);
  }, [filters, products, sortOption, fitmentSizes]);

  const sortProducts = (products, option) => {
    const sorted = [...products];
    switch (option) {
      case "name-asc":
        return sorted.sort((a, b) => (a.brand || "").localeCompare(b.brand || ""));
      case "name-desc":
        return sorted.sort((a, b) => (b.brand || "").localeCompare(a.brand || ""));
      case "price-asc":
        return sorted.sort((a, b) => (parseFloat(a.price) || 0) - (parseFloat(b.price) || 0));
      case "price-desc":
        return sorted.sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0));
      default:
        return sorted;
    }
  };

  const handleView = (id) => navigate(`/view-product/${id}`);

  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIdx, startIdx + itemsPerPage);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  return (
    <div className="catalog">
      <div className="catalog-header">
        <h3>
          Product Catalog {vehicleLabel && <span>for {vehicleLabel}</span>}
        </h3>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="sort-select"
        >
          <option value="default">Sort by</option>
          <option value="name-asc">Name (A–Z)</option>
          <option value="name-desc">Name (Z–A)</option>
          <option value="price-asc">Price (Low to High)</option>
          <option value="price-desc">Price (High to Low)</option>
        </select>
      </div>

      <div className="product-grid">
        {paginatedProducts.length === 0 ? (
          <p className="no-products">No products available.</p>
        ) : (
          paginatedProducts.map((product) => {
            const {
              id,
              imageUrl,
              name,
              brand = "Unknown Brand",
              model = "Unknown Model",
              size = "Unknown Size",
              price,
              reviews = [],
              new: isNew,
            } = product;

            return (
              <div key={id} className="product-card" onClick={() => handleView(id)}>
                {isNew && <div className="tag">NEW</div>}
                <img
                  src={imageUrl || "https://placehold.co/150x150?text=No+Image"}
                  alt={name || "Product Image"}
                  className="product-img"
                  onError={(e) => {
                    e.target.src = "https://placehold.co/150x150?text=No+Image";
                  }}
                />
                <h4 className="product-name">{brand}</h4>
                <p className="product-model-size">
                  {size} {model}
                </p>
                <p className="product-price">₱{price?.toLocaleString() || "N/A"}</p>
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
              key={i + 1}
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
