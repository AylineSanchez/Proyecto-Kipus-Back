// components/NotificationContainer.js
import React from 'react';
import Notification from './Notification';
import '../views/styles.css';

const NotificationContainer = ({ notifications, onCloseNotification }) => {
  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          notification={notification}
          onClose={onCloseNotification}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;