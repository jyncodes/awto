import React from "react";
import Inventory from "../shared/Reservations"; 

export default function AdminReservations() {
  return (
    <div className="admin-reservations-page">
      <Inventory role="admin" />
    </div>
  );
}
