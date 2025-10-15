// src/pages/admin-dashboard/Inventory.jsx
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import '../../styles/admin-styles/Inventory.css';
import Restock from '../../components/admin-components/Restock';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState('id-asc');

  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockList, setRestockList] = useState([]);
  const [restockSearch, setRestockSearch] = useState('');

  // =========================
  // FETCH PRODUCTS (Tires + Mags)
  // =========================
  useEffect(() => {
    const unsubTires = onSnapshot(collection(db, 'products_tires'), (snapshot) => {
      const tireList = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: 'Tire',
        ...doc.data(),
      }));

      setProducts((prev) => {
        const magsOnly = prev.filter((p) => p.type === 'Mags');
        return [...tireList, ...magsOnly];
      });
    });

    const unsubMags = onSnapshot(collection(db, 'products_mags'), (snapshot) => {
      const magsList = snapshot.docs.map((doc) => ({
        id: doc.id,
        type: 'Mags',
        ...doc.data(),
      }));

      setProducts((prev) => {
        const tiresOnly = prev.filter((p) => p.type === 'Tire');
        return [...tiresOnly, ...magsList];
      });
    });

    return () => {
      unsubTires();
      unsubMags();
    };
  }, []);

  // =========================
  // FILTER + SORT
  // =========================
  useEffect(() => {
    let filtered = [...products];

    if (searchTerm.trim() !== '') {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter((p) =>
        `${p.productId} ${p.brand} ${p.model}`.toLowerCase().includes(lower)
      );
    }

    switch (sortOption) {
      case 'id-asc':
        filtered.sort((a, b) => (a.productId || '').localeCompare(b.productId || ''));
        break;
      case 'id-desc':
        filtered.sort((a, b) => (b.productId || '').localeCompare(a.productId || ''));
        break;
      case 'stock-asc':
        filtered.sort((a, b) => Number(a.stock || 0) - Number(b.stock || 0));
        break;
      case 'stock-desc':
        filtered.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
        break;
      case 'modified-latest':
        filtered.sort((a, b) => {
          const aTime = a.updatedAt?.toMillis?.() || 0;
          const bTime = b.updatedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        break;
      default:
        break;
    }

    setFilteredProducts(filtered);
  }, [products, searchTerm, sortOption]);

  // =========================
  // RESTOCK MODAL
  // =========================
  const openRestockModal = () => {
    setRestockList([]);
    setRestockSearch('');
    setIsRestockOpen(true);
  };

  const closeRestockModal = () => {
    setIsRestockOpen(false);
  };

  const handleSearchRestockProduct = () => {
    const term = restockSearch.toLowerCase();
    const result = products
      .filter((p) =>
        `${p.productId} ${p.brand} ${p.model}`.toLowerCase().includes(term)
      )
      .map((p) => ({ ...p, qty: 0 }));
    setRestockList(result);
  };

  const handleRestockInput = (e, id) => {
    const qty = parseInt(e.target.value || 0);
    setRestockList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, qty } : item))
    );
  };

  const saveRestocks = async () => {
    try {
      for (const item of restockList) {
        if (item.qty > 0) {
          const collectionName =
            item.type === 'Tire' ? 'products_tires' : 'products_mags';
          const ref = doc(db, collectionName, item.id);
          const original = products.find((p) => p.id === item.id);
          const newStock = Number(original.stock || 0) + Number(item.qty);

          await updateDoc(ref, {
            stock: newStock,
            updatedAt: serverTimestamp(),
          });
        }
      }
      setIsRestockOpen(false);
    } catch (err) {
      console.error('Restock failed:', err);
      alert('Failed to save restocks.');
    }
  };

  return (
    <div className="inventory-page-container">
      <h1 className="inventory-page-title">Inventory</h1>

      <div className="inventory-controls">
        <input
          type="text"
          placeholder="Search by Product Name or ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-bar"
        />
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="sort-select"
        >
          <option value="id-asc">Ascending Product ID</option>
          <option value="id-desc">Descending Product ID</option>
          <option value="stock-asc">Stock Low to High</option>
          <option value="stock-desc">Stock High to Low</option>
          <option value="modified-latest">Latest Modified</option>
        </select>
        <button onClick={openRestockModal} className="restock-btn">
          Restock
        </button>
      </div>

      <div className="inventory-card">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Product Name</th>
              <th>Type</th>
              <th>Status</th>
              <th>Stock</th>
              <th>Price</th>
              <th>Total</th>
              <th>Last Modified</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                let productName = `${product.brand} ${product.model}`;
                if (product.type === 'Tire') {
                  productName += ` ${product.tireWidth || ''}/${product.aspectRatio || ''}R${product.rimDiameter || ''}`;
                } else {
                  productName += ` ${product.wheelDiameter || ''}x${product.wheelWidth || ''}`;
                }

                const total = Number(product.stock || 0) * Number(product.price || 0);
                const status = Number(product.stock) <= 4 ? 'Out of Stock' : 'In Stock';
                const date = product.updatedAt?.toDate?.().toLocaleString() || '—';

                return (
                  <tr key={product.id}>
                    <td>{product.productId || product.id}</td>
                    <td>{productName}</td>
                    <td>{product.type}</td>
                    <td className={status === 'Out of Stock' ? 'text-red' : 'text-green'}>
                      {status}
                    </td>
                    <td>{product.stock || 0}</td>
                    <td>₱{Number(product.price || 0).toFixed(2)}</td>
                    <td>₱{total.toFixed(2)}</td>
                    <td>{date}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" className="text-center text-gray-500">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isRestockOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <Restock
              searchValue={restockSearch}
              setSearchValue={setRestockSearch}
              onSearch={handleSearchRestockProduct}
              restockList={restockList}
              onChangeQty={handleRestockInput}
              onClose={closeRestockModal}
              onSave={saveRestocks}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
