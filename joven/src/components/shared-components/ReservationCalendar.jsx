import React from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../../styles/shared/ReservationCalendar.css";



// ==========================
// LOCALIZER SETTINGS
// ==========================
const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

// ==========================
// STATUS COLORS
// ==========================
const statusColors = {
  Approved: "#34A853",   // green
  Pending: "#FBBC04",    // yellow/orange
  Completed: "#4285F4",  // blue
  "No-Show": "#EA4335",  // red
  Cancelled: "#888888",  // gray
};

// ==========================
// MAIN COMPONENT
// ==========================
const ReservationCalendar = ({ reservations, onSelectReservation }) => {

  // Convert Firestore reservations → Calendar events
  const events = reservations.map((res) => {
    const date = res.preferredDate?.seconds
      ? new Date(res.preferredDate.seconds * 1000)
      : new Date(res.preferredDate);

    // Build title
    const name = res.userName || "Customer";
    const service =
      res.productName ||
      (res.selectedServices?.length
        ? res.selectedServices.map((s) => s.name).join(", ")
        : "Service");

    return {
      title: `${name} — ${service}`,
      start: date,
      end: date,
      allDay: true,
      status: res.status || "Pending",
      reservationData: res,
    };
  });

  // ==========================
  // CUSTOM EVENT STYLE
  // ==========================
  const eventStyleGetter = (event) => {
    const bgColor = statusColors[event.status] || "#6C757D";

    return {
      style: {
        backgroundColor: bgColor,
        color: "white",
        borderRadius: "6px",
        padding: "4px",
        border: "none",
        fontSize: "0.85rem",
        cursor: "pointer",
      },
    };
  };

  return (
    <div
      style={{
        height: 550,
        borderRadius: "12px",
        overflow: "hidden",
        background: "white",
        padding: "1rem",
      }}
    >
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        onSelectEvent={(event) => onSelectReservation(event.reservationData)}
        eventPropGetter={eventStyleGetter}
        popup
      />
    </div>
  );
};

export default ReservationCalendar;
