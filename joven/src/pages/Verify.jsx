import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import {
  sendEmailVerification,
  reload,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import '../styles/Verify.css';

const Verify = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [emailSent, setEmailSent] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await reload(currentUser);
        setUser(currentUser);
        setIsVerified(currentUser.emailVerified);
        setLoading(false);

        if (!currentUser.emailVerified && !emailSent) {
          handleSendEmail(currentUser);
        }
      } else {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [emailSent, navigate]);

  useEffect(() => {
    let interval;
    if (cooldown > 0) {
      interval = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) clearInterval(interval);
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSendEmail = async (currentUser = user) => {
    if (!currentUser || currentUser.emailVerified) return;

    try {
      await sendEmailVerification(currentUser);
      setEmailSent(true);
      setCooldown(60);
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Too many requests. Please try again later.');
    }
  };

  const handleCheckVerification = async () => {
    try {
      await reload(user);
      if (user.emailVerified) {
        setIsVerified(true);
      } else {
        alert('Email is still not verified.');
      }
    } catch (error) {
      console.error('Reload error:', error);
      alert('Something went wrong. Please try again.');
    }
  };

  const handleGoToLogin = async () => {
    try {
      await signOut(auth); // logout first
      navigate('/login'); // then go to login
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="verify-loading-screen">
        <div className="verify-spinner" />
      </div>
    );
  }

  return (
    <div className="verify-page">
      <div className="verify-container">
        <h2 className="verify-title">Verify Your Email</h2>

        {!isVerified ? (
          <>
            <p className="verify-description">
              A verification link has been sent to:<br />
              <span className="verify-email">{user?.email}</span><br />
              Please check your inbox or spam folder.
            </p>

            {emailSent && (
              <p className="verify-success">✅ Verification email sent successfully!</p>
            )}

            {cooldown > 0 ? (
              <p className="verify-description">
                You can resend the email in <strong>{cooldown}</strong> seconds.
              </p>
            ) : (
              <button
                onClick={handleSendEmail}
                className="verify-button"
              >
                Resend Verification Email
              </button>
            )}

            <button
              onClick={handleCheckVerification}
              className="verify-secondary-button"
            >
              I’ve already verified. Check again.
            </button>
          </>
        ) : (
          <>
            <p className="verify-success">Your email is verified!</p>
            <button
              onClick={handleGoToLogin}
              className="verify-button verify-success-button"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default Verify;
