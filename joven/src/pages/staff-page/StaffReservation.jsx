// 📄 src/pages/staff-page/StaffReservation.jsx
import React from "react";
import StaffLayout from "./StaffLayout";
import Reservations from "../shared/Reservations";

const StaffReservation = () => {
  return (
    <StaffLayout>
      <Reservations role="staff" />
    </StaffLayout>
  );
};

export default StaffReservation;
