// src/components/user-components/Filter.jsx
import React, { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/user-styles/Filter.css";

const Filter = ({ onChange, mobileControl }) => {
  const [filtersData, setFiltersData] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [expanded, setExpanded] = useState([]);
  const [searchTerms, setSearchTerms] = useState({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Sync mobile state with parent
  useEffect(() => {
    if (mobileControl?.open !== undefined) {
      setIsMobileOpen(mobileControl.open);
    }
  }, [mobileControl?.open]);

  useEffect(() => {
    if (mobileControl?.setOpen) {
      mobileControl.setOpen(isMobileOpen);
    }
  }, [isMobileOpen]);

  // Fetch filter data
  useEffect(() => {
    const fetchFilters = async () => {
      const tireSnap = await getDocs(collection(db, "products_tires"));
      const magsSnap = await getDocs(collection(db, "products_mags"));

      const products = [
        ...tireSnap.docs.map((d) => d.data()),
        ...magsSnap.docs.map((d) => d.data()),
      ];

      const uniqueValues = {
        brand: new Set(),
        model: new Set(),
        size: new Set(),
        type: new Set(),
        price: new Set(),
      };

      products.forEach((product) => {
        if (product.brand) uniqueValues.brand.add(product.brand.trim());
        if (product.model) uniqueValues.model.add(product.model.trim());

        if (product.tireWidth && product.aspectRatio && product.rimDiameter)
          uniqueValues.size.add(
            `${product.tireWidth}/${product.aspectRatio}R${product.rimDiameter}`
          );

        if (product.wheelDiameter && product.wheelWidth && product.boltPattern)
          uniqueValues.size.add(
            `${product.wheelDiameter}x${product.wheelWidth} ${product.boltPattern}`
          );

        if (product.type) uniqueValues.type.add(product.type);

        const price = parseInt(product.retail ?? product.price);
        if (!isNaN(price)) {
          if (price <= 1000) uniqueValues.price.add("₱0 - ₱1,000");
          else if (price <= 2000) uniqueValues.price.add("₱1,001 - ₱2,000");
          else if (price <= 3000) uniqueValues.price.add("₱2,001 - ₱3,000");
          else if (price <= 5000) uniqueValues.price.add("₱3,001 - ₱5,000");
          else uniqueValues.price.add("₱5,000+");
        }
      });

      setFiltersData([
        { name: "brand", label: "Brand", options: [...uniqueValues.brand], multiSelect: true },
        { name: "model", label: "Model", options: [...uniqueValues.model], multiSelect: true },
        { name: "size", label: "Size", options: [...uniqueValues.size], multiSelect: true },
        { name: "type", label: "Type", options: [...uniqueValues.type], multiSelect: true },
        { name: "price", label: "Price", options: [...uniqueValues.price], multiSelect: false },
      ]);
    };

    fetchFilters();
  }, []);

  // Push filters to parent
  useEffect(() => {
    const formatted = Object.fromEntries(
      Object.entries(selectedFilters).map(([key, set]) => [key, [...set]])
    );
    onChange && onChange(formatted);
  }, [selectedFilters]);

  const toggleExpand = (name) =>
    setExpanded((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );

  const toggleOption = (filter, option, multi) => {
    setSelectedFilters((prev) => {
      const set = new Set(prev[filter] || []);
      if (set.has(option)) set.delete(option);
      else {
        if (!multi) return { ...prev, [filter]: new Set([option]) };
        set.add(option);
      }
      return { ...prev, [filter]: set };
    });
  };

  const clearAll = () => setSelectedFilters({});

  return (
    <>
      {/* MOBILE FILTER BUTTON */}
      <button className="filter-toggle-btn" onClick={() => setIsMobileOpen(true)}>
        Filter
      </button>

      {/* OVERLAY */}
      <div
        className={`filter-overlay ${isMobileOpen ? "visible" : ""}`}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* FILTER PANEL */}
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

          const filteredOptions =
            options.length > 5
              ? options.filter((item) =>
                  item.toLowerCase().includes(search.toLowerCase())
                )
              : options;

          return (
            <div key={name} className="filter-block">
              <div className="filter-header" onClick={() => toggleExpand(name)}>
                <span>{label}</span>
                <span className="chev">{expandedNow ? "−" : "+"}</span>
              </div>

              {expandedNow && (
                <div className="filter-content">
                  {options.length > 5 && (
                    <input
                      type="text"
                      className="filter-search"
                      placeholder={`Search ${label}...`}
                      value={search}
                      onChange={(e) =>
                        setSearchTerms({ ...searchTerms, [name]: e.target.value })
                      }
                    />
                  )}

                  {filteredOptions.map((option) => (
                    <div
                      key={option}
                      className={`filter-option ${
                        selected.has(option) ? "selected" : ""
                      }`}
                      onClick={() => toggleOption(name, option, multiSelect)}
                    >
                      {option}
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
