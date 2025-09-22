import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const ProtectedRoute = ({ allowedRole, children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      try {
        // First check users collection
        let ref = doc(db, 'users', user.uid);
        let snap = await getDoc(ref);

        if (!snap.exists()) {
          // Then check staff collection
          ref = doc(db, 'staff', user.uid);
          snap = await getDoc(ref);
        }

        if (snap.exists()) {
          const { role } = snap.data();
          if (role === allowedRole) {
            setIsAuthorized(true);
          } else {
            setIsAuthorized(false);
          }
        } else {
          setIsAuthorized(false);
        }
      } catch (err) {
        console.error('Authorization error (Firestore read):', err);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [allowedRole]);

  if (loading) return <div className="text-center py-20 text-lg">Loading...</div>;
  return isAuthorized ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
