import React, { useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "../../styles/shared/ReservationCalendar.css";

/* ==========================
   LOCALIZER SETTINGS
========================== */
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

/* ==========================
   STATUS COLORS
========================== */
const statusColors = {
  Approved: "#34A853",
  Pending: "#FBBC04",
  Completed: "#4285F4",
  "No-Show": "#EA4335",
  Cancelled: "#888888",
};

const ReservationCalendar = ({
  reservations,
  closedDates = {},
  onSelectReservation,
  onSelectDate,
}) => {
  /* ✅ FIX: control current calendar month */
  const [currentDate, setCurrentDate] = useState(new Date());

  const events = reservations.map((res) => {
    const date = res.preferredDate?.seconds
      ? new Date(res.preferredDate.seconds * 1000)
      : new Date(res.preferredDate);

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

  const eventStyleGetter = (event) => ({
    style: {
      backgroundColor: statusColors[event.status] || "#6C757D",
      color: "white",
      borderRadius: "6px",
      padding: "4px",
      fontSize: "0.85rem",
      cursor: "pointer",
    },
  });

  const dayPropGetter = (date) => {
    const key = new Date(date).toDateString();
    if (closedDates[key]) {
      return {
        style: {
          backgroundColor: "#f8d7da",
          opacity: 0.6,
        },
      };
    }
    return {};
  };

  return (
    <div style={{ height: 550, background: "#fff", padding: "1rem" }}>
      <Calendar
        localizer={localizer}
        events={events}
        views={["month"]}
        startAccessor="start"
        endAccessor="end"

        /* ✅ REQUIRED FIX */
        date={currentDate}
        onNavigate={(date) => setCurrentDate(date)}

        selectable
        onSelectSlot={(slotInfo) => {
          onSelectDate?.(slotInfo.start);
        }}

        onDrillDown={(date) => {
          setCurrentDate(date);
          onSelectDate?.(date);
        }}

        onSelectEvent={(event) =>
          onSelectReservation(event.reservationData)
        }

        eventPropGetter={eventStyleGetter}
        dayPropGetter={dayPropGetter}
        popup
      />
    </div>
  );
};

export default ReservationCalendar;
