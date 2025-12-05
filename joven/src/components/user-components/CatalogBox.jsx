import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/user-styles/CatalogBox.css";

const SUPABASE_BASE_URL =
  "https://ojyapkmalpnfwskpozbx.supabase.co/storage/v1/object/public/Images";

const CatalogBox = ({ filters = {} }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { vehicleLabel = "", fitment = {} } = location.state || {};

  const [products, setProducts] = useState([]);
  const [validImages, setValidImages] = useState({});
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // ================================
  // FETCH PRODUCTS
  // ================================
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const collections = [
          { name: "Tire", ref: collection(db, "products_tires") },
          { name: "Mags", ref: collection(db, "products_mags") },
        ];

        const raw = [];

        for (const { name, ref } of collections) {
          const snapshot = await getDocs(ref);

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();

            // Build size string from fields
            let sizeString =
              data.size ||
              (data.tireWidth && data.rimDiameter
                ? data.aspectRatio
                  ? `${data.tireWidth}/${data.aspectRatio}R${data.rimDiameter}`
                  : `${data.tireWidth}R${data.rimDiameter}`
                : null);

            // ✅ Fallback for Mags
            if (!sizeString && name === "Mags") {
              sizeString = data.rimDiameter ? `R${data.rimDiameter}` : "Set";
            }

            raw.push({
              id: docSnap.id,
              brand: data.brand || "Unbranded",
              model: data.model || "",
              type: data.type || name,
              retail: Number(data.retail ?? data.price ?? 0),
              sizeString: sizeString,
              stock: data.stock ?? 0,
              ...data,
            });
          });
        }

        // MERGE by brand + model
        const merged = {};

        raw.forEach((p) => {
          const key = `${p.brand}-${p.model}`;

          if (!merged[key]) {
            merged[key] = {
              brand: p.brand,
              model: p.model,
              type: p.type,
              sizes: [],
              minPrice: p.retail,
              maxPrice: p.retail,
            };
          }

          // Store each size WITH docId, price, stock
          if (p.sizeString) {
            merged[key].sizes.push({
              size: p.sizeString,
              docId: p.id,
              price: p.retail,
              stock: p.stock,
            });
          }

          // Update price range
          merged[key].minPrice = Math.min(merged[key].minPrice, p.retail);
          merged[key].maxPrice = Math.max(merged[key].maxPrice, p.retail);
        });

        setProducts(Object.values(merged));
      } catch (e) {
        console.error("❌ Error fetching products:", e);
      }
    };

    fetchProducts();
  }, []);

  // ================================
  // CHECK IMAGES (dynamic)
  // ================================
  useEffect(() => {
    const checkImages = async () => {
      const imageMap = {};

      await Promise.all(
        products.map(async (product) => {
          const timestamp = Date.now();
          const pngUrl = `${SUPABASE_BASE_URL}/${product.sizes?.[0]?.docId}.png?t=${timestamp}`;
          const jpegUrl = `${SUPABASE_BASE_URL}/${product.sizes?.[0]?.docId}.jpeg?t=${timestamp}`;

          try {
            const res = await fetch(pngUrl, { method: "HEAD" });
            if (res.ok) return (imageMap[product.brand + product.model] = pngUrl);

            const res2 = await fetch(jpegUrl, { method: "HEAD" });
            if (res2.ok)
              return (imageMap[product.brand + product.model] = jpegUrl);

            imageMap[product.brand + product.model] = null;
          } catch {
            imageMap[product.brand + product.model] = null;
          }
        })
      );

      setValidImages(imageMap);
    };

    if (products.length > 0) checkImages();
  }, [products]);

  // ================================
  // FILTERS + SORTING
  // ================================
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (filters.brand?.length)
      result = result.filter((p) => filters.brand.includes(p.brand));

    if (filters.model?.length)
      result = result.filter((p) => filters.model.includes(p.model));

    if (filters.type?.length)
      result = result.filter((p) => filters.type.includes(p.type));

    if (filters.size?.length)
      result = result.filter((p) =>
        p.sizes.some((s) => filters.size.includes(s.size))
      );

    if (filters.price?.length) {
      result = result.filter((p) => {
        const price = p.minPrice;

        return filters.price.some((range) => {
          if (range === "₱0 - ₱1,000") return price <= 1000;
          if (range === "₱1,001 - ₱2,000") return price <= 2000 && price >= 1001;
          if (range === "₱2,001 - ₱3,000") return price <= 3000 && price >= 2001;
          if (range === "₱3,001 - ₱5,000") return price <= 5000 && price >= 3001;
          if (range === "₱5,000+") return price >= 5001;
          return true;
        });
      });
    }

    // FITMENT FILTER FIX
    if (fitment && fitment.size) {
      result = result.filter((p) =>
        p.sizes.some((s) => s.size === fitment.size)
      );
    }

    // SORTING
    switch (sortOption) {
      case "name-asc":
        return result.sort((a, b) => a.brand.localeCompare(b.brand));
      case "name-desc":
        return result.sort((a, b) => b.brand.localeCompare(a.brand));
      case "price-asc":
        return result.sort((a, b) => a.minPrice - b.minPrice);
      case "price-desc":
        return result.sort((a, b) => b.minPrice - a.minPrice);
      default:
        return result;
    }
  }, [products, filters, sortOption, fitment]);

  // ================================
  // PAGINATION
  // ================================
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = filteredProducts.slice(startIdx, startIdx + itemsPerPage);
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const handleView = (product) =>
    navigate(`/view-product/${product.sizes[0].docId}`, {
      state: {
        sizes: product.sizes,
        brand: product.brand,
        model: product.model,
        vehicleLabel,
      },
    });

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
        {paginated.length === 0 ? (
          <p className="no-products">⚠️ No products found.</p>
        ) : (
          paginated.map((p) => {
            const imageKey = p.brand + p.model;
            const img =
              validImages[imageKey] ||
              "https://placehold.co/150x150?text=No+Image";

            return (
              <div
                key={imageKey}
                className="product-card"
                onClick={() => handleView(p)}
              >
                <img src={img} alt={p.model} className="product-img" />

                <h4 className="product-name">{p.brand}</h4>
                <p className="product-model">{p.model}</p>

                <p className="product-price">
                  {p.minPrice === p.maxPrice
                    ? `₱${p.minPrice.toLocaleString()}`
                    : `₱${p.minPrice.toLocaleString()} – ₱${p.maxPrice.toLocaleString()}`}
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
              key={i}
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
