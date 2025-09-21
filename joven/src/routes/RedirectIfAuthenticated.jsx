
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

const RedirectIfAuthenticated = ({ children, origin }) => {
  const [checking, setChecking] = useState(true);
  const [redirectTo, setRedirectTo] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setChecking(false);
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const { role } = userSnap.data() || {};

          switch (role) {
            case 'Admin':
              setRedirectTo('/admin-dashboard');
              break;
            case 'Staff':
              setRedirectTo('/staff-dashboard');
              break;
            case 'User':
              // 🔥 Smart redirection for user role
              if (origin === '/register') {
                setRedirectTo('/');
              } else {
                setRedirectTo('/user-dashboard');
              }
              break;
            default:
              setRedirectTo('/');
          }
        }
      } catch (error) {
        console.error('Error checking user role:', error);
      }

      setChecking(false);
    });

    return () => unsubscribe();
  }, [origin]);

  if (checking) return null; // Can replace with a spinner if needed
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return children;
};

export default RedirectIfAuthenticated;
