// ==============================
// StaffInventory.jsx
// ==============================
import React from "react";
import StaffLayout from "./StaffLayout";
import Inventory from "../shared/Inventory"; 
import "../../styles/shared/Inventory.css";

const StaffInventory = () => {
  return (
    <StaffLayout>
      <div className="staff-inventory-page">
        <Inventory role="staff" /> 

      </div>
    </StaffLayout>
  );
};

export default StaffInventory;
