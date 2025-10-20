// 📄 src/pages/staff-page/StaffSales.jsx
import React from "react";
import StaffLayout from "./StaffLayout";
import Sales from "../shared/Sales"; // ✅ Use shared component

const StaffSales = () => {
  return (
    <StaffLayout>
      {/* You can pass a role if you need role-based behavior */}
      <Sales role="staff" />
    </StaffLayout>
  );
};

export default StaffSales;
