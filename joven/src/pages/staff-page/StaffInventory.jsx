// ==============================
// StaffInventory.jsx
// ==============================
import React from "react";
import StaffLayout from "./StaffLayout";
import Inventory from "../shared/Inventory"; // ✅ Correct import path
import "../../styles/shared/Inventory.css";

const StaffInventory = () => {
  return (
    <StaffLayout>
      <div className="staff-inventory-page">
        <Inventory role="staff" /> 
        {/* 👆 You can pass props to adjust behavior for staff if needed */}
      </div>
    </StaffLayout>
  );
};

export default StaffInventory;
