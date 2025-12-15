// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { FiShoppingCart, FiUser } from "react-icons/fi";
import { FaBars } from "react-icons/fa";
import jovenLogo from "../assets/jovenlogo.png";
import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import "../styles/Navbar.css";

import LoginSection from "./LoginSection";
import MySelection from "./user-components/MySelection";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const accountRef = useRef(null);

  const [showLogin, setShowLogin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCartPanel, setShowCartPanel] = useState(false);

  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  const [isVerified, setIsVerified] = useState(false);

  /* ================= AUTH LISTENER ================= */
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(null);
      setUserData(null);
      setCartItems([]);
      setIsVerified(false);

      if (!currentUser) return;

      // 🔒 UNVERIFIED USER
      if (!currentUser.emailVerified) {
        setUser(currentUser);
        setIsVerified(false);
        return;
      }

      // ✅ VERIFIED USER
      setUser(currentUser);
      setIsVerified(true);

      const userRef = doc(db, "users", currentUser.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) setUserData(userSnap.data());

      const cartQuery = query(
        collection(db, "cartSelections"),
        where("userId", "==", currentUser.uid)
      );

      const unsubscribeCart = onSnapshot(cartQuery, (snapshot) => {
        setCartItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });



      return () => {
        unsubscribeCart();
      };
    });

    return () => unsubscribeAuth();
  }, []);

  /* ================= CLICK OUTSIDE ================= */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setShowDropdown(false);
    navigate("/");
  };

  const goToProfileTab = (tab) => {
    setShowDropdown(false);
    navigate(`/profile?tab=${tab}`);
  };


  const goToSection = (id) => {
    if (location.pathname !== "/") {
      navigate("/#" + id);
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 200);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="navbar">

        {/* LEFT */}
        <div className="left-nav" onClick={() => navigate("/")}>
          <img src={jovenLogo} alt="Joven Tire Logo" className="logo" />
          <span className="brand-name">Joven Tire Enterprise</span>
        </div>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          <FaBars />
        </button>

        <div className={`center-nav ${menuOpen ? "open" : ""}`}>
          <button className="nav-link" onClick={() => goToSection("fitment")}>Fitment</button>
          <button className="nav-link" onClick={() => goToSection("brand")}>Brand</button>
          <button className="nav-link" onClick={() => goToSection("services")}>Services</button>
          <button className="nav-link" onClick={() => goToSection("about")}>About</button>
        </div>

        <div className="right-nav">

          {isVerified && (
            <>
              <button className="icon-button" onClick={() => setShowCartPanel(!showCartPanel)}>
                <FiShoppingCart size={20} />
                {cartItems.length > 0 && <span className="badge">{cartItems.length}</span>}
              </button>
            </>
          )}

          {/* ACCOUNT */}
          <div ref={accountRef} className="account-nav">

            {user && isVerified ? (
              <div className="profile-dropdown">
                <button className="account-link" onClick={() => setShowDropdown(!showDropdown)}>
                  <span className="account-text">
                    {userData?.name || user.email.split("@")[0]}
                  </span>
                  <FiUser size={20} />
                </button>

                {showDropdown && (
                  <div className="dropdown-menu">
                    <div className="dropdown-greeting">
                      Hi, <strong>{userData?.name}</strong>
                    </div>

                    <button className="dropdown-item" onClick={() => goToProfileTab("myaccount")}>
                      My Account
                    </button>

                    <button className="dropdown-item" onClick={() => goToProfileTab("reservations")}>
                      My Reservations
                    </button>

                    <button className="dropdown-item logout" onClick={handleLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>

            ) : user && !isVerified ? (
              /* ⚠️ UNVERIFIED USER */
               <div className="profile-dropdown">
    <button
      className="account-link"
      onClick={() => setShowDropdown(!showDropdown)}
    >
      <span className="account-text">Unverified</span>
      <FiUser size={20} />
    </button>

    {showDropdown && (
      <div className="dropdown-menu">
        <div className="dropdown-greeting">
          ⚠️ Email not verified
        </div>

        <button
          className="dropdown-item"
          onClick={() => navigate("/verify")}
        >
          Verify Email
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
              <button className="account-link" onClick={() => setShowLogin(true)}>
                <span className="account-text">Account</span>
                <FiUser size={20} />
              </button>
            )}

          </div>
        </div>
      </nav>

      {showLogin && (
        <div className="login-popup-overlay" onClick={() => setShowLogin(false)}>
          <div className="login-popup" onClick={(e) => e.stopPropagation()}>
            <LoginSection onClose={() => setShowLogin(false)} />
          </div>
        </div>
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
