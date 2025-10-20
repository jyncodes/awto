import React from "react";
import Inventory from "../shared/Inventory"; 

export default function AdminInventory() {
  return (
    <div className="admin-inventory-page">
      <Inventory role="admin" />
    </div>
  );
}
