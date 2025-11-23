import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/user-styles/CatalogBox.css";

const SUPABASE_BASE_URL =
  "https://ojyapkmalpnfwskpozbx.supabase.co/storage/v1/object/public/Images";

const CatalogBox = ({ filters }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { size: fitmentSizes = [], vehicleLabel = "", fitment = {} } =
    location.state || {};

  const [products, setProducts] = useState([]);
  const [validImages, setValidImages] = useState({});
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // ================================
  // FETCH PRODUCTS (Tires + Mags)
  // ================================
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const collections = [
          { name: "Tire", ref: collection(db, "products_tires") },
          { name: "Mags", ref: collection(db, "products_mags") },
        ];

        const rawProducts = [];

        for (const { name, ref } of collections) {
          const snapshot = await getDocs(ref);

          snapshot.forEach((doc) => {
            const data = doc.data();

            const tireSize =
              data.size ||
              (data.tireWidth && data.rimDiameter
                ? data.aspectRatio
                  ? `${data.tireWidth}/${data.aspectRatio}R${data.rimDiameter}`
                  : `${data.tireWidth}R${data.rimDiameter}`
                : null);

            rawProducts.push({
              id: doc.id,
              brand: data.brand || "Unbranded",
              model: data.model || "",
              type: data.type || name,
              price: Number(data.price) || 0,
              retail: Number(data.retail) || Number(data.price) || 0, // ✅ ADDED
              sizeString: tireSize || "",
              tireWidth: data.tireWidth || "",
              aspectRatio: data.aspectRatio || "",
              rimDiameter: data.rimDiameter || "",
              wheelWidth: data.wheelWidth || "",
              boltPattern: data.boltPattern || "",
              ...data,
            });
          });
        }

        // ================================
        // MERGE BY BRAND + MODEL
        // ================================
        const merged = {};

        rawProducts.forEach((p) => {
          const key = `${p.brand}-${p.model}`;

          if (!merged[key]) {
            merged[key] = {
              id: p.id,
              brand: p.brand,
              model: p.model,
              type: p.type,
              price: p.price,
              retail: p.retail, // ✅ ADDED
              sizes: [],
              tireWidth: p.tireWidth,
              wheelWidth: p.wheelWidth,
              rimDiameter: p.rimDiameter,
              boltPattern: p.boltPattern,
            };
          }

          if (p.sizeString) {
            merged[key].sizes.push(p.sizeString);
          }
        });

        setProducts(Object.values(merged));
      } catch (error) {
        console.error("❌ Error fetching products:", error);
      }
    };

    fetchProducts();
  }, []);

  // ================================
  // CHECK IMAGES
  // ================================
  useEffect(() => {
    const checkImages = async () => {
      const newValidImages = {};

      await Promise.all(
        products.map(async (product) => {
          const timestamp = Date.now();
          const pngUrl = `${SUPABASE_BASE_URL}/${product.id}.png?t=${timestamp}`;
          const jpegUrl = `${SUPABASE_BASE_URL}/${product.id}.jpeg?t=${timestamp}`;

          try {
            const res = await fetch(pngUrl, { method: "HEAD", cache: "no-store" });
            if (res.ok) {
              newValidImages[product.id] = pngUrl;
              return;
            }

            const res2 = await fetch(jpegUrl, {
              method: "HEAD",
              cache: "no-store",
            });
            if (res2.ok) {
              newValidImages[product.id] = jpegUrl;
              return;
            }

            newValidImages[product.id] = null;
          } catch {
            newValidImages[product.id] = null;
          }
        })
      );

      setValidImages(newValidImages);
    };

    if (products.length > 0) checkImages();
  }, [products]);

  // ================================
  // FILTERING + SORTING
  // ================================
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // 🔹 Fitment filters
    if (fitment && Object.keys(fitment).length > 0) {
      result = result.filter((p) => {
        if (fitment.type === "tire") {
          return (
            p.tireWidth === fitment.tireWidth &&
            p.rimDiameter === fitment.rimDiameter
          );
        } else if (fitment.type === "wheel") {
          return (
            p.wheelWidth === fitment.width &&
            p.rimDiameter === fitment.rimDiameter &&
            p.boltPattern === fitment.boltPattern
          );
        }
        return true;
      });
    }

    switch (sortOption) {
      case "name-asc":
        return result.sort((a, b) => a.brand.localeCompare(b.brand));
      case "name-desc":
        return result.sort((a, b) => b.brand.localeCompare(a.brand));
      case "price-asc":
        return result.sort((a, b) => a.retail - b.retail); // ✅ SORT BY RETAIL
      case "price-desc":
        return result.sort((a, b) => b.retail - a.retail); // ✅ SORT BY RETAIL
      default:
        return result;
    }
  }, [products, sortOption, fitment]);

  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(
    startIdx,
    startIdx + itemsPerPage
  );
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleView = (product) =>
    navigate(`/view-product/${product.id}`, {
      state: {
        ...location.state,
        sizes: product.sizes,
        brand: product.brand,
        model: product.model,
      },
    });

  return (
    <div className="catalog">
      <div className="catalog-header">
        <h3>
          Product Catalog{" "}
          {vehicleLabel && <span className="vehicle-label">for {vehicleLabel}</span>}
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
          <p className="no-products">⚠️ No products found.</p>
        ) : (
          paginatedProducts.map((product) => {
            const imageSrc =
              validImages[product.id] ||
              "https://placehold.co/150x150?text=No+Image";

            return (
              <div
                key={product.id}
                className="product-card"
                onClick={() => handleView(product)}
              >
                <img
                  src={imageSrc}
                  alt={`${product.brand} ${product.model}`}
                  className="product-img"
                />

                <h4 className="product-name">{product.brand}</h4>
                <p className="product-model">{product.model}</p>

                <p className="product-price">
                  ₱{product.retail.toLocaleString()} {/* ✅ NOW SHOWING RETAIL */}
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
