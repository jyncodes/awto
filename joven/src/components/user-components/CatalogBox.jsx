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

  // Fetch products
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

            const wheelSize =
              data.wheelDiameter && data.wheelWidth
                ? `${data.wheelDiameter}x${data.wheelWidth}`
                : null;

            const wheelSpecs =
              data.boltPattern || data.offset || data.centerBore
                ? [
                    data.boltPattern || "",
                    data.offset || "",
                    data.centerBore ? `CB${data.centerBore}` : "",
                  ]
                    .filter((v) => v !== "")
                    .join(" ")
                : "";

            const fullWheelSize =
              wheelSize && wheelSpecs
                ? `${wheelSize} ${wheelSpecs}`
                : wheelSize || wheelSpecs || null;

            const tireSize =
              data.size ||
              (data.tireWidth && data.rimDiameter
                ? data.aspectRatio
                  ? `${data.tireWidth}/${data.aspectRatio}R${data.rimDiameter}`
                  : `${data.tireWidth}R${data.rimDiameter}`
                : null);

            allProducts.push({
              id: doc.id,
              category: name,
              ...data,
              type: data.type || name,
              brand: data.brand || "Unbranded",
              model: data.model || "",
              price: data.price ? Number(data.price) : 0,
              size: fullWheelSize || tireSize || "Unknown",
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

  // Check images
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

            const res2 = await fetch(jpegUrl, { method: "HEAD", cache: "no-store" });
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

  // Filtering
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (fitment?.type) {
      if (fitment.type.toLowerCase() === "tire") {
        result = result.filter(
          (product) => product.type?.toLowerCase() === "tire"
        );
      } else if (fitment.type.toLowerCase() === "wheel") {
        result = result.filter(
          (product) =>
            product.type?.toLowerCase() === "wheel" ||
            product.type?.toLowerCase() === "mags"
        );
      }
    }

    if (filters && Object.keys(filters).length > 0) {
      result = result.filter((product) =>
        Object.entries(filters).every(([key, values]) => {
          const value = (product[key] || "").toString().toLowerCase();
          return values.some((v) => value.includes(v.toLowerCase()));
        })
      );
    }

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
              product.wheelDiameter?.toString() ===
                fitment.rimDiameter?.toString()) &&
            (!fitment.boltPattern ||
              product.boltPattern?.toString().toLowerCase() ===
                fitment.boltPattern?.toString().toLowerCase()) &&
            (!fitment.offset ||
              product.offset?.toString().toLowerCase() ===
                fitment.offset?.toString().toLowerCase()) &&
            (!fitment.centerBore ||
              product.centerBore?.toString() ===
                fitment.centerBore?.toString())
          );
        }

        return true;
      });
    }

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

  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(
    startIdx,
    startIdx + itemsPerPage
  );
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleView = (category, id) =>
    navigate(`/view-product/${id}`, { state: { ...location.state, category } });

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
            ⚠️ No products matched your filters. Try removing filters or
            adjusting fitment.
          </p>
        ) : (
          paginatedProducts.map((product) => {
            const imageSrc =
              validImages[product.id] ||
              "https://placehold.co/150x150?text=No+Image";

            return (
              <div
                key={product.id}
                className="product-card"
                onClick={() => handleView(product.category, product.id)}
              >
                <img
                  src={imageSrc}
                  alt={`${product.brand || "Brand"} ${product.model || ""}`}
                  className="product-img"
                  onError={(e) =>
                    (e.target.src = "https://placehold.co/150x150?text=No+Image")
                  }
                />

                {/* ✔ BRAND */}
                <h4 className="product-name">{product.brand}</h4>

                {/* ✔ MODEL */}
                <p className="product-model">{product.model}</p>

                {/* ✔ SIZE (below model) */}
                <p className="product-size">{product.size}</p>

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
