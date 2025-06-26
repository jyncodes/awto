import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/CatalogBox.css";

const CatalogBox = ({ filters }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [sortOption, setSortOption] = useState("default");

  const itemsPerPage = 8;
  const [currentPage, setCurrentPage] = useState(1);

  // One-time fetch from Firestore
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(collection(db, "products"));
        const fetched = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setProducts(fetched);
      } catch (error) {
        console.error("Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  // Apply filters + sort
  useEffect(() => {
    let result = products;

    if (filters && Object.keys(filters).length > 0) {
      result = result.filter((product) =>
        Object.entries(filters).every(([key, values]) => {
          const value = (product[key] || "").toString().toLowerCase();
          return values.some((v) => value.includes(v.toLowerCase()));
        })
      );
    }

    setFilteredProducts(sortProducts(result, sortOption));
    setCurrentPage(1);
  }, [filters, products, sortOption]);

  const sortProducts = (products, option) => {
    const sorted = [...products];
    switch (option) {
      case "name-asc":
        return sorted.sort((a, b) => (a.brand || "").localeCompare(b.brand || ""));
      case "name-desc":
        return sorted.sort((a, b) => (b.brand || "").localeCompare(a.brand || ""));
      case "price-asc":
        return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
      case "price-desc":
        return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
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
        <h3>Product Catalog</h3>
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
