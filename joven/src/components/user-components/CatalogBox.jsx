// src/components/user-components/CatalogBox.jsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/user-styles/CatalogBox.css";

const SUPABASE_BASE_URL =
  "https://ojyapkmalpnfwskpozbx.supabase.co/storage/v1/object/public/Images";

const CatalogBox = ({ filters = {}, onPageData }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { vehicleLabel = "", fitment = {} } = location.state || {};

  const [products, setProducts] = useState([]);
  const [validImages, setValidImages] = useState({});
  const [sortOption, setSortOption] = useState("default");
  const [currentPage, setCurrentPage] = useState(1);

  const itemsPerPage = 8;

  /* ================================
     FETCH PRODUCTS (unchanged)
  ================================== */
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

            let sizeString;
            if (name === "Tire") {
              sizeString =
                data.size ||
                (data.tireWidth && data.rimDiameter
                  ? data.aspectRatio
                    ? `${data.tireWidth}/${data.aspectRatio}R${data.rimDiameter}`
                    : `${data.tireWidth}R${data.rimDiameter}`
                  : null);
            }

            if (name === "Mags") {
              sizeString = `${data.wheelDiameter}x${data.wheelWidth} ${data.boltPattern}`;
            }

            raw.push({
              id: docSnap.id,
              brand: data.brand || "Unbranded",
              model: data.model || "",
              type: data.type || name,
              retail: Number(data.retail ?? data.price ?? 0),
              sizeString,
              stock: data.stock ?? 0,
              ...data,
            });
          });
        }

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

          if (p.sizeString) {
            merged[key].sizes.push({
              size: p.sizeString,
              docId: p.id,
              price: p.retail,
              stock: p.stock,
            });
          }

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

  /* ================================
     CHECK IMAGES (unchanged)
  ================================== */
  useEffect(() => {
    const checkImages = async () => {
      const imageMap = {};

      await Promise.all(
        products.map(async (product) => {
          const id = product.sizes?.[0]?.docId;
          const timestamp = Date.now();

          const pngUrl = `${SUPABASE_BASE_URL}/${id}.png?t=${timestamp}`;
          const jpegUrl = `${SUPABASE_BASE_URL}/${id}.jpeg?t=${timestamp}`;

          try {
            const res = await fetch(pngUrl, { method: "HEAD" });
            if (res.ok) {
              imageMap[product.brand + product.model] = pngUrl;
              return;
            }

            const res2 = await fetch(jpegUrl, { method: "HEAD" });
            if (res2.ok) {
              imageMap[product.brand + product.model] = jpegUrl;
              return;
            }

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

  /* ================================
     FILTER + SORT (unchanged)
  ================================== */
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

    if (fitment?.size) {
      result = result.filter((p) =>
        p.sizes.some((s) => s.size === fitment.size)
      );
    }

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

  /* ================================
     PAGINATION (NO UI here)
  ================================== */
  const startIdx = (currentPage - 1) * itemsPerPage;
  const paginated = filteredProducts.slice(startIdx, startIdx + itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage));

  /* ---- CLAMP currentPage when filteredProducts changes ----
     If filtering reduces total pages, ensure currentPage is valid.
     This prevents empty paginated arrays when user was on a higher page.
  --------------------------------------------------------- */
  useEffect(() => {
    if (currentPage > totalPages) {
      // move to first page when the current page is out of range
      setCurrentPage(1);
    }
    // only depend on totalPages and currentPage
  }, [totalPages, currentPage]);

  /* SEND PAGE DATA BACK TO USERDASHBOARD (stable deps) */
  useEffect(() => {
    onPageData &&
      onPageData({
        currentPage,
        totalPages,
        setPage: setCurrentPage,
        totalItems: filteredProducts.length,
        showing: paginated.length,
      });
    // included dependencies so parent gets updated info whenever pagination changes
  }, [currentPage, totalPages, filteredProducts.length, paginated.length, onPageData]);

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
      {/* Sort only */}
      <div className="catalog-header">
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
        {paginated.length === 0 ? (
          <p className="no-products">⚠️ No products found.</p>
        ) : (
          paginated.map((p) => {
            const key = p.brand + p.model;
            const img =
              validImages[key] ||
              "https://placehold.co/150x150?text=No+Image";

            return (
              <div key={key} className="product-card" onClick={() => handleView(p)}>
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
    </div>
  );
};

export default CatalogBox;
