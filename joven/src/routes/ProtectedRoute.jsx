import React, { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const ProtectedRoute = ({ role, children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login'); 
        return;
      }

      try {
        let ref = doc(db, 'users', user.uid);
        let snap = await getDoc(ref);

        if (!snap.exists()) {
          ref = doc(db, 'staff', user.uid);
          snap = await getDoc(ref);
        }

        if (snap.exists()) {
          const { role: userRole } = snap.data();
          if (userRole === role) {
            setIsAuthorized(true);
          } else {
            navigate('/'); // redirect home if wrong role
          }
        } else {
          navigate('/');
        }
      } catch (err) {
        console.error('Authorization error:', err);
        navigate('/');
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [role, navigate]);

  if (loading) return <div className="text-center py-20 text-lg">Loading...</div>;
  return isAuthorized ? children : null;
};

export default ProtectedRoute;
