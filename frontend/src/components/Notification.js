// components/Notification.js
import React, { useEffect } from 'react';
import '../views/styles.css';

const Notification = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification.autoClose) {
      const timer = setTimeout(() => {
        onClose(notification.id);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '💡';
    }
  };

  return (
    <div className={`notification ${notification.type} ${notification.hiding ? 'hiding' : ''}`}>
      <div className="notification-icon">
        {getIcon()}
      </div>
      <div className="notification-content">
        {notification.title && (
          <div className="notification-title">{notification.title}</div>
        )}
        <div className="notification-message">{notification.message}</div>
      </div>
      <button 
        className="notification-close" 
        onClick={() => onClose(notification.id)}
        aria-label="Cerrar notificación"
      >
        ×
      </button>
    </div>
  );
};

export default Notification;