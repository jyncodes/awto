// src/components/user-components/Filter.jsx
import React, { useState, useEffect, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { SlidersHorizontal, ChevronDown } from "lucide-react";
import "../../styles/user-styles/Filter.css";

/* ================= HELPERS ================= */
const toTitleCase = (str = "") =>
  str
    .toLowerCase()
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

const Filter = ({ onChange, mobileControl }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [expanded, setExpanded] = useState([]);
  const [searchTerms, setSearchTerms] = useState({});
  const [fromLanding, setFromLanding] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  /* ================= SYNC MOBILE STATE ================= */
  useEffect(() => {
    if (mobileControl?.open !== undefined) {
      setIsMobileOpen(mobileControl.open);
    }
  }, [mobileControl?.open]);

  useEffect(() => {
    mobileControl?.setOpen && mobileControl.setOpen(isMobileOpen);
  }, [isMobileOpen]);

  /* ================= AUTO FILTER FROM LANDING ================= */
useEffect(() => {
  const storedBrand = localStorage.getItem("selectedBrand");
  const landingFlag = localStorage.getItem("fromLanding");

  if (!storedBrand || !landingFlag) return;

  setFromLanding(true);

  // auto select
  setSelectedFilters({
    type: new Set(["Tire"]),
    brand: new Set([storedBrand]),
    model: new Set(),
  });

  // auto open Brand section
  setExpanded((prev) => [...new Set([...prev, "brand"])]);

  // cleanup
  localStorage.removeItem("selectedBrand");
  localStorage.removeItem("fromLanding");
}, []);

  /* ================= FETCH DATA ================= */
  useEffect(() => {
    const fetchData = async () => {
      const tireSnap = await getDocs(collection(db, "products_tires"));
      const magsSnap = await getDocs(collection(db, "products_mags"));

      const products = [
        ...tireSnap.docs.map((d) => ({ ...d.data(), _collection: "tires" })),
        ...magsSnap.docs.map((d) => ({ ...d.data(), _collection: "mags" })),
      ];

      setAllProducts(products);
    };

    fetchData();
  }, []);

  /* ================= AUTO FILTER FROM LANDING PAGE ================= */
useEffect(() => {
  const storedBrand = localStorage.getItem("selectedBrand");
  if (!storedBrand) return;

  console.log("Auto filter brand:", storedBrand); // debug

  setSelectedFilters({
    type: new Set(["Tire"]),          // EXACT match sa Firestore
    brand: new Set([storedBrand]),    // EXACT match sa Firestore
    model: new Set(),
  });

  localStorage.removeItem("selectedBrand");
}, []);


  /* ================= DERIVED FILTER OPTIONS ================= */
  const filtersData = useMemo(() => {
    let filtered = [...allProducts];

    // Apply selected Type
    if (selectedFilters.type?.size) {
      filtered = filtered.filter((p) =>
      selectedFilters.type.has(p.type)
      );
    }

    // Apply selected Brand
    if (selectedFilters.brand?.size) {
      filtered = filtered.filter((p) =>
      selectedFilters.brand.has(p.brand)
      );
    }

    const unique = {
      type: new Set(),
      brand: new Set(),
      model: new Set(),
      price: new Set(),
    };

    filtered.forEach((p) => {
      if (p.type) unique.type.add(p.type.trim());
      if (p.brand) unique.brand.add(p.brand.trim());
      if (p.model) unique.model.add(p.model.trim());


      const price = parseInt(p.retail ?? p.price);
      if (!isNaN(price)) {
        if (price <= 1000) unique.price.add("₱0 - ₱1,000");
        else if (price <= 2000) unique.price.add("₱1,001 - ₱2,000");
        else if (price <= 3000) unique.price.add("₱2,001 - ₱3,000");
        else if (price <= 5000) unique.price.add("₱3,001 - ₱5,000");
        else unique.price.add("₱5,000+");
      }
    });

    return [
      {
        name: "type",
        label: "Type",
        options: [...unique.type].sort(),
        multiSelect: true,
      },
      {
        name: "brand",
        label: "Brand",
        options: [...unique.brand].sort(),
        multiSelect: true,
      },
      {
        name: "model",
        label: "Model",
        options: [...unique.model].sort(),
        multiSelect: true,
      },
      {
        name: "price",
        label: "Price",
        options: [...unique.price],
        multiSelect: false,
      },
    ];
  }, [allProducts, selectedFilters]);

  /* ================= PUSH FILTERS ================= */
  useEffect(() => {
    const formatted = Object.fromEntries(
      Object.entries(selectedFilters).map(([k, v]) => [k, [...v]])
    );
    onChange && onChange(formatted);
  }, [selectedFilters, onChange]);

  /* ================= ACTIONS ================= */
  const toggleExpand = (name) =>
    setExpanded((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );

  const toggleOption = (filter, option, multi) => {
    if (fromLanding && filter === "type") return; // 👈 LOCK TYPE

    setSelectedFilters((prev) => {
      const set = new Set(prev[filter] || []);
      if (set.has(option)) set.delete(option);
      else {
        if (!multi) return { ...prev, [filter]: new Set([option]) };
        set.add(option);
      }

      if (filter === "brand") {
        return { ...prev, brand: set, model: new Set() };
      }

      return { ...prev, [filter]: set };
    });
  };

  const clearAll = () => setSelectedFilters({});

  /* ================= RENDER ================= */
  return (
    <>
      <button
        className="filter-toggle-btn sort-like"
        onClick={() => setIsMobileOpen(true)}
      >
        <span className="filter-label">
          <SlidersHorizontal size={16} />
          Filter
        </span>
        <ChevronDown size={18} />
      </button>

      <div
        className={`filter-overlay ${isMobileOpen ? "visible" : ""}`}
        onClick={() => setIsMobileOpen(false)}
      />

      <aside className={`filters ${isMobileOpen ? "open" : ""}`}>
        <div className="filters-header">
          <h3>Filters</h3>
          {Object.keys(selectedFilters).length > 0 && (
            <button className="clear-btn" onClick={clearAll}>
              Clear All
            </button>
          )}
        </div>

        {filtersData.map(({ name, label, options, multiSelect }) => {
          const expandedNow = expanded.includes(name);
          const selected = selectedFilters[name] || new Set();
          const search = searchTerms[name] || "";

          const shownOptions =
            options.length > 5
              ? options.filter((o) =>
                  o.toLowerCase().includes(search.toLowerCase())
                )
              : options;

          return (
            <div key={name} className="filter-block">
              <div
                className="filter-header"
                onClick={() => toggleExpand(name)}
              >
                <span>{label}</span>
                <span className="chev">{expandedNow ? "−" : "+"}</span>
              </div>

              {expandedNow && (
                <div className="filter-content">
                  {options.length > 5 && (
                    <input
                      className="filter-search"
                      placeholder={`Search ${label}...`}
                      value={search}
                      onChange={(e) =>
                        setSearchTerms({
                          ...searchTerms,
                          [name]: e.target.value,
                        })
                      }
                    />
                  )}

                  {shownOptions.map((option) => (
                    <div
                      key={option}
                      className={`filter-option ${
                        selected.has(option) ? "selected" : ""
                      }`}
                      onClick={() =>
                        toggleOption(name, option, multiSelect)
                      }
                    >
                      {toTitleCase(option)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </aside>
    </>
  );
};

export default Filter;
