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
        let snap = await getDoc(doc(db, 'users', user.uid));
        if (!snap.exists()) snap = await getDoc(doc(db, 'staff', user.uid));

        if (snap.exists()) {
          const { role } = snap.data() || {};
          switch (role) {
            case 'Admin':
              setRedirectTo('/admin-dashboard');
              break;
            case 'Staff':
              setRedirectTo('/staff-dashboard');
              break;
            case 'User':
              setRedirectTo(origin === '/register' ? '/' : '/user-dashboard');
              break;
            default:
              setRedirectTo('/');
          }
        }
      } catch (err) {
        console.error('RedirectIfAuthenticated error:', err);
      } finally {
        setChecking(false);
      }
    });

    return () => unsubscribe();
  }, [origin]);

  if (checking) return null;
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return children;
};

export default RedirectIfAuthenticated;
