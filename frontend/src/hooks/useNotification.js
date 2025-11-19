// hooks/useNotification.js
import { useState, useCallback } from 'react';

export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback(({ type, title, message, autoClose = true, duration = 5000 }) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      type,
      title,
      message,
      autoClose,
      duration
    };

    setNotifications(prev => [...prev, newNotification]);

    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, hiding: true } : notif
      )
    );
    
    // Remover completamente después de la animación
    setTimeout(() => {
      setNotifications(prev => prev.filter(notif => notif.id !== id));
    }, 300);
  }, []);

  const showSuccess = useCallback((message, title = '¡Éxito!') => {
    return addNotification({ type: 'success', title, message });
  }, [addNotification]);

  const showError = useCallback((message, title = 'Error') => {
    return addNotification({ type: 'error', title, message });
  }, [addNotification]);

  const showInfo = useCallback((message, title = 'Información') => {
    return addNotification({ type: 'info', title, message });
  }, [addNotification]);

  const showWarning = useCallback((message, title = 'Advertencia') => {
    return addNotification({ type: 'warning', title, message });
  }, [addNotification]);

  return {
    notifications,
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showInfo,
    showWarning
  };
};