// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PayPalScriptProvider
      options={{
        "client-id": paypalClientId,
        currency: "PHP",
      }}
    >
      <App />
    </PayPalScriptProvider>
  </React.StrictMode>
);
