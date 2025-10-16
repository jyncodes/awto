// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { FaBars } from "react-icons/fa";
import { FiBell, FiShoppingCart } from "react-icons/fi";
import jovenLogo from "../assets/jovenlogo.png";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import "../styles/Navbar.css";

import LoginSection from "./LoginSection";
import NotificationPanel from "./user-components/NotificationPanel";
import MySelection from "./user-components/MySelection";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const accountRef = useRef(null);

  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) setUserData(userSnap.data());

        const cartQuery = query(
          collection(db, "cartSelections"),
          where("userId", "==", currentUser.uid)
        );
        const unsubscribeCart = onSnapshot(cartQuery, (snapshot) => {
          const items = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setCartItems(items);
        });

        const notifQuery = query(
          collection(db, "notifications"),
          where("userId", "==", currentUser.uid),
          orderBy("createdAt", "desc")
        );
        const unsubscribeNotif = onSnapshot(notifQuery, (snapshot) => {
          const notifList = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setNotifications(notifList);
        });

        return () => {
          unsubscribeCart();
          unsubscribeNotif();
        };
      }
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowCartPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setShowDropdown(false);
    setUserData(null);
    navigate("/");
  };

  const goToProfileTab = (tab) => {
    setShowDropdown(false);
    navigate(`/profile?tab=${tab}`);
  };

  const handleLoginSuccess = (userData) => {
    setUserData(userData);
    setShowLogin(false);
  };

  const handleRemoveCartItem = async (itemId) => {
    try {
      await deleteDoc(doc(db, "cartSelections", itemId));
    } catch (error) {
      console.error("Error removing item:", error);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <nav className="navbar">
        {/* LEFT */}
        <div
          className="left-nav"
          onClick={() => navigate("/")}
          style={{ cursor: "pointer" }}
        >
          <img src={jovenLogo} alt="Joven Tire Logo" className="logo" />
          <span className="brand-name">Joven Tire Enterprise</span>
        </div>

        {/* MOBILE MENU */}
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <FaBars />
        </button>

        {/* CENTER */}
        <div className={`center-nav ${menuOpen ? "open" : ""}`}>
          <a
            href="#fitment"
            className="nav-link"
            onClick={() => setMenuOpen(false)}
          >
            Fitment
          </a>
          <a
            href="#brand"
            className="nav-link"
            onClick={() => setMenuOpen(false)}
          >
            Brand
          </a>
          <a
            href="#services"
            className="nav-link"
            onClick={() => setMenuOpen(false)}
          >
            Services
          </a>
          <a
            href="#about"
            className="nav-link"
            onClick={() => setMenuOpen(false)}
          >
            About
          </a>
        </div>

        {/* RIGHT */}
        <div className="right-nav">
          <div className="icon-buttons">
            <button
              className="icon-button"
              title="Notifications"
              onClick={() => setShowNotifications((prev) => !prev)}
            >
              <FiBell size={20} />
              {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
            </button>

            <button
              className="icon-button"
              title="My Selections"
              onClick={() => setShowCartPanel((prev) => !prev)}
            >
              <FiShoppingCart size={20} />
              {cartItems.length > 0 && (
                <span className="badge">{cartItems.length}</span>
              )}
            </button>
          </div>

          {/* Account / Profile */}
          <div ref={accountRef} className="account-nav">
            {user ? (
              <div className="profile-dropdown">
                <button
                  className="nav-link account-link"
                  onClick={() => setShowDropdown((prev) => !prev)}
                >
                  {user.displayName || user.email}
                </button>
                {showDropdown && (
                  <div className="dropdown-menu">
                    <button
                      className="dropdown-item"
                      onClick={() => goToProfileTab("profile")}
                    >
                      Profile
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => goToProfileTab("reservations")}
                    >
                      My Reservations
                    </button>
                    <button
                      className="dropdown-item"
                      onClick={() => goToProfileTab("settings")}
                    >
                      Settings
                    </button>
                    <button
                      className="dropdown-item logout"
                      onClick={handleLogout}
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                className="nav-link account-link"
                onClick={() => {
                  setShowLogin(true);
                  setMenuOpen(false);
                }}
              >
                Account
              </button>
            )}
          </div>
        </div>
      </nav>

      {showLogin && (
        <div
          className="login-popup-overlay"
          onClick={() => setShowLogin(false)}
        >
          <div className="login-popup" onClick={(e) => e.stopPropagation()}>
            <LoginSection
              onClose={() => setShowLogin(false)}
              onLoginSuccess={handleLoginSuccess}
              origin={location.pathname}
            />
          </div>
        </div>
      )}

      {showNotifications && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotifications(false)}
        />
      )}

      {showCartPanel && (
        <MySelection
          cartItems={cartItems}
          onClose={() => setShowCartPanel(false)}
        />
      )}
    </>
  );
};

export default Navbar;
