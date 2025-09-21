import React from 'react';
import '../../styles/NotificationPanel.css';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';
  try {
    const date =
      typeof timestamp.toDate === 'function'
        ? timestamp.toDate()
        : new Date(timestamp);
    return new Intl.DateTimeFormat('en-PH', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return '';
  }
};

const NotificationPanel = ({ notifications, onClose }) => {
  const navigate = useNavigate();

  const markAllAsRead = async () => {
    try {
      const unreadNotifs = notifications.filter((notif) => !notif.isRead && notif.id);
      const updates = unreadNotifs.map((notif) =>
        updateDoc(doc(db, 'notifications', notif.id), { isRead: true })
      );
      await Promise.all(updates);
      console.log('Marked all notifications as read');
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
    }
  };

  const handleClose = async () => {
    await markAllAsRead();
    onClose();
  };

  const handleView = async (notifId) => {
    try {
      if (notifId) {
        await updateDoc(doc(db, 'notifications', notifId), { isRead: true });
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
    onClose(); // Close the panel before redirect
    navigate("/profile?tab=reservations"); // go to profile and reservations

  };

  return (
    <div className="notification-panel-overlay" onClick={handleClose}>
      <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          <h3>Notifications</h3>
          <button className="close-button" onClick={handleClose}> 
            &times;
          </button>
        </div>

        <div className="notification-body"> 
          {notifications.length === 0 ? (
            <p className="no-notifications">You're all caught up!</p>
          ) : (
            <ul className="notification-list">
              {notifications.map((notif, index) => (
                <li
                  key={index}
                  className={`notification-item ${!notif.isRead ? 'unread' : ''}`}
                >
                  <p className="notification-message">{notif.message}</p>
                  <p className="notification-timestamp">
                    {formatTimestamp(notif.createdAt)}
                  </p>
                  <button
                    className="view-button"
                    onClick={() => handleView(notif.id)}
                  >
                    View
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPanel;
