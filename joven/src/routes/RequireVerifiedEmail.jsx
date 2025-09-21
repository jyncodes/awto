import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const RequireVerifiedEmail = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await user.reload();
        if (user.emailVerified) {
          setVerified(true);
        }
      }
      setChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const Spinner = () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
    </div>
  );

  if (checking) return <Spinner />;
  if (!verified) return <Navigate to="/verify" replace />;
  return children;
};

export default RequireVerifiedEmail;
