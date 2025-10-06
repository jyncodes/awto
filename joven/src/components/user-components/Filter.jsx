import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase"; 
import "../../styles/user-styles/Filter.css";

const Filter = ({ onChange }) => {
  const [filtersData, setFiltersData] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [expanded, setExpanded] = useState([]);
  const [searchTerms, setSearchTerms] = useState({});
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Fetch unique filter values from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const products = snapshot.docs.map((doc) => doc.data());

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
        if (product.size) uniqueValues.size.add(product.size.trim());
        if (product.type) uniqueValues.type.add(product.type.trim());
        if (product.price) {
          const price = parseInt(product.price);
          if (!isNaN(price)) {
            if (price <= 1000) uniqueValues.price.add("₱0 - ₱1,000");
            else if (price <= 2000) uniqueValues.price.add("₱1,001 - ₱2,000");
            else if (price <= 3000) uniqueValues.price.add("₱2,001 - ₱3,000");
            else uniqueValues.price.add("₱3,000+");
          }
        }
      });

      setFiltersData([
        { name: "brand", label: "Brand", options: Array.from(uniqueValues.brand), multiSelect: true },
        { name: "model", label: "Model", options: Array.from(uniqueValues.model), multiSelect: true },
        { name: "size", label: "Size", options: Array.from(uniqueValues.size), multiSelect: true },
        { name: "type", label: "Type", options: Array.from(uniqueValues.type), multiSelect: true },
        { name: "price", label: "Price", options: Array.from(uniqueValues.price), multiSelect: false },
      ]);
    });

    return () => unsubscribe();
  }, []);

  // Send filters to parent
  useEffect(() => {
    const filtersToSend = Object.fromEntries(
      Object.entries(selectedFilters).map(([key, valueSet]) => [key, Array.from(valueSet)])
    );
    onChange && onChange(filtersToSend);
  }, [selectedFilters, onChange]);

  const toggleExpand = (filterName) => {
    setExpanded((prev) =>
      prev.includes(filterName)
        ? prev.filter((name) => name !== filterName)
        : [...prev, filterName]
    );
  };

  const toggleOption = (filterName, option, multiSelect) => {
    setSelectedFilters((prev) => {
      const currentSet = new Set(prev[filterName] || []);
      if (currentSet.has(option)) {
        currentSet.delete(option);
      } else {
        if (!multiSelect) {
          return { ...prev, [filterName]: new Set([option]) };
        }
        currentSet.add(option);
      }
      return { ...prev, [filterName]: currentSet };
    });
  };

  const clearAll = () => {
    setSelectedFilters({});
  };

  const handleSearchChange = (filterName, value) => {
    setSearchTerms((prev) => ({ ...prev, [filterName]: value }));
  };

  return (
    <>
      <button className="filter-toggle-btn" onClick={() => setIsMobileOpen(true)}>
        Filters
      </button>

      <div className={`filter-overlay ${isMobileOpen ? "visible" : ""}`} onClick={() => setIsMobileOpen(false)} />

      <div className={`filters ${isMobileOpen ? "open" : ""}`}>
        <div className="filters-header">
          <h3>Filters</h3>
          {Object.keys(selectedFilters).length > 0 && (
            <button onClick={clearAll} className="clear-btn">
              Clear All
            </button>
          )}
        </div>


        {filtersData.map(({ name, label, options, multiSelect }) => {
          const isExpanded = expanded.includes(name);
          const selectedSet = selectedFilters[name] || new Set();
          const search = searchTerms[name] || "";

          const filteredOptions =
            options.length > 5
              ? options.filter((opt) =>
                  opt.toLowerCase().includes(search.toLowerCase())
                )
              : options;

          return (
            <div key={name}>
              <div
                className="filter-header"
                onClick={() => toggleExpand(name)}
                tabIndex={0}
                role="button"
                aria-expanded={isExpanded}
              >
                <span>{label}</span>
                <span>{isExpanded ? "−" : "+"}</span>
              </div>

              {isExpanded && (
                <div className="filter-content" role="group" aria-label={`${label} filter options`}>
                  {options.length > 5 && (
                    <input
                      type="text"
                      placeholder={`Search ${label}...`}
                      className="filter-search"
                      value={search}
                      onChange={(e) => handleSearchChange(name, e.target.value)}
                    />
                  )}
                  {filteredOptions.map((option) => {
                    const selected = selectedSet.has(option);
                    return (
                      <div
                        key={option}
                        className={`filter-option ${selected ? "selected" : ""}`}
                        onClick={() => toggleOption(name, option, multiSelect)}
                        tabIndex={0}
                        role="checkbox"
                        aria-checked={selected}
                      >
                        {option}
                      </div>
                    );
                  })}
                  {filteredOptions.length === 0 && <p>No options found.</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default Filter;
