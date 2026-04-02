'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, Clock, CheckCircle, RotateCcw, Dumbbell, Apple, MessageCircle, Target, AlertCircle } from 'lucide-react';

interface Notification {
  id: string;
  type: 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_RESCHEDULED' | 'WORKOUT_ASSIGNED' | 'MEAL_PLAN_ASSIGNED' | 'MEAL_PLAN_ENDED' | 'MESSAGE_RECEIVED' | 'PROGRESS_REMINDER' | 'GENERAL';
  title: string;
  message: string;
  appointmentId?: string;
  clientName?: string;
  appointmentTime?: string;
  timestamp: Date;
  read: boolean;
}

interface NotificationSystemProps {
  userId: string;
  userRole: string;
}

export default function NotificationSystem({ userId, userRole }: NotificationSystemProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)); // Start 7 days ago
  const [animateCount, setAnimateCount] = useState(false);


  // Fetch initial notifications (last 7 days)
  const fetchInitialNotifications = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const response = await fetch(`/api/notifications?since=${sevenDaysAgo.toISOString()}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const initialNotifications = await response.json();
        
        // Deduplicate notifications to prevent React key conflicts
        const uniqueNotifications = initialNotifications.reduce((acc: Notification[], notification: Notification) => {
          const existingIndex = acc.findIndex(n => n.id === notification.id);
          if (existingIndex === -1) {
            acc.push(notification);
          }
          return acc;
        }, []);
        
        setNotifications(uniqueNotifications);
        setLastChecked(new Date());
      } else if (response.status === 401) {
        // Session not ready yet, silently retry later
        setTimeout(fetchInitialNotifications, 10000);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== 'AbortError') {
        console.warn('Network error fetching notifications:', error.message);
      }
      // Silently retry after longer delay
      setTimeout(fetchInitialNotifications, 15000);
    }
  }, []);

  // Fetch new notifications
  const checkForNotifications = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications?since=${lastChecked.toISOString()}`);

      if (response.ok) {
        const newNotifications = await response.json();
        
        if (newNotifications.length > 0) {
          setNotifications(prev => {
            // Combine and deduplicate notifications
            const combined = [...newNotifications, ...prev];
            const unique = combined.reduce((acc: Notification[], notification: Notification) => {
              const existingIndex = acc.findIndex(n => n.id === notification.id);
              if (existingIndex === -1) {
                acc.push(notification);
              }
              return acc;
            }, []);
            return unique;
          });
          
          // Animate the badge count
          setAnimateCount(true);
          setTimeout(() => setAnimateCount(false), 600);
          
          // Show popup for new notifications
          newNotifications.forEach((notification: Notification) => {
            if (notification.type === 'APPOINTMENT_CANCELLED') {
              showPopupNotification(notification);
            }
          });
          
          setLastChecked(new Date());
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Network error checking notifications:', error.message);
      }
    }
  }, [lastChecked]);

  // Show popup notification
  const showPopupNotification = (notification: Notification) => {
    // Create a temporary popup that auto-dismisses
    const popup = document.createElement('div');
    popup.className = 'fixed top-4 right-4 z-[60] bg-red-500 text-white p-4 rounded-lg shadow-lg max-w-sm animate-slide-in';
    
    // Create close button with proper event handler
    const closeButton = document.createElement('button');
    closeButton.className = 'flex-shrink-0 text-white hover:text-gray-200 transition-colors';
    closeButton.innerHTML = `
      <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    `;
    closeButton.onclick = () => {
      if (popup.parentNode) {
        popup.remove();
      }
    };
    
    // Create the main content
    const content = document.createElement('div');
    content.className = 'flex items-start space-x-3';
    content.innerHTML = `
      <div class="flex-shrink-0">
        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <div class="flex-1">
        <h4 class="font-semibold">${notification.title}</h4>
        <p class="text-sm mt-1">${notification.message}</p>
        ${notification.clientName && notification.appointmentTime ? 
          `<p class="text-xs mt-2 opacity-75">${notification.clientName} • ${new Date(notification.appointmentTime).toLocaleString()}</p>` : 
          ''
        }
      </div>
    `;
    
    // Append close button to content
    content.appendChild(closeButton);
    popup.appendChild(content);
    
    document.body.appendChild(popup);
    
    // Auto remove after 10 seconds
    setTimeout(() => {
      if (popup.parentNode) {
        popup.remove();
      }
    }, 10000);
  };

  // Poll for notifications every 30 seconds
  useEffect(() => {
    // Check for both TRAINER and CLIENT roles
    if (userRole === 'TRAINER' || userRole === 'CLIENT') {
      
      // Add delay to ensure session is fully established
      const initNotifications = () => {
        // Initial fetch of recent notifications
        fetchInitialNotifications();
        
        // Set up polling for new notifications (reduced frequency for development)
        const interval = setInterval(checkForNotifications, 120000); // 2 minutes instead of 30 seconds
        
        return () => clearInterval(interval);
      };
      
      // Wait a moment for session to be ready
      const timeoutId = setTimeout(() => {
        const cleanup = initNotifications();
        return cleanup;
      }, 1500);
      
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [userRole, fetchInitialNotifications, checkForNotifications]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ read: true })
      });
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    unreadNotifications.forEach(n => markAsRead(n.id));
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Clear all notifications
  const clearAll = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'DELETE'
      });

      if (response.ok) {
        setNotifications([]);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to clear notifications: ${errorData.error || 'Server error'}`);
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
      alert('Failed to clear notifications. Please try again.');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (userRole !== 'TRAINER' && userRole !== 'CLIENT') return null;

  return (
    <>
      {/* Notification Bell Icon */}
      <div className="relative">
        <motion.button
          onClick={() => setShowNotifications(!showNotifications)}
          className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors duration-200 focus:outline-none"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Bell className="w-6 h-6" />
          
          {/* Animated Badge */}
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ 
                  scale: animateCount ? [1, 1.3, 1] : 1,
                  backgroundColor: animateCount ? ['#ef4444', '#dc2626', '#ef4444'] : '#ef4444'
                }}
                exit={{ scale: 0 }}
                transition={{ 
                  duration: animateCount ? 0.6 : 0.2,
                  ease: "easeInOut"
                }}
                className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>

        {/* Notification Dropdown */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="fixed sm:absolute right-2 sm:right-0 left-2 sm:left-auto mt-2 sm:w-80 bg-white dark:bg-[#1a1f2e] rounded-xl shadow-xl border border-gray-200 dark:border-[#2a3042] z-50"
            >
              <div className="p-4 border-b border-gray-200 dark:border-[#2a3042]">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    Notifications {unreadCount > 0 && `(${unreadCount})`}
                  </h3>
                  <div className="flex space-x-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center space-x-1"
                        title="Mark all as read"
                      >
                        <CheckCircle className="w-3 h-3" />
                        <span>Read All</span>
                      </button>
                    )}
                    {notifications.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-xs text-red-600 hover:text-red-800 flex items-center space-x-1"
                        title="Clear all notifications"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="max-h-[60dvh] sm:max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No notifications</p>
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-4 border-b border-gray-100 dark:border-[#242938] hover:bg-gray-50 dark:hover:bg-[#242938] cursor-pointer transition-colors ${
                        !notification.read ? 'bg-indigo-50 dark:bg-indigo-500/8 border-l-4 border-l-indigo-500' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {notification.type === 'APPOINTMENT_CANCELLED' && (
                            <X className="w-5 h-5 text-red-500" />
                          )}
                          {notification.type === 'APPOINTMENT_RESCHEDULED' && (
                            <Clock className="w-5 h-5 text-yellow-500" />
                          )}
                          {notification.type === 'WORKOUT_ASSIGNED' && (
                            <Dumbbell className="w-5 h-5 text-blue-500" />
                          )}
                          {notification.type === 'MEAL_PLAN_ASSIGNED' && (
                            <Apple className="w-5 h-5 text-green-500" />
                          )}
                          {notification.type === 'MEAL_PLAN_ENDED' && (
                            <Apple className="w-5 h-5 text-orange-500" />
                          )}
                          {notification.type === 'MESSAGE_RECEIVED' && (
                            <MessageCircle className="w-5 h-5 text-blue-500" />
                          )}
                          {notification.type === 'PROGRESS_REMINDER' && (
                            <Target className="w-5 h-5 text-purple-500" />
                          )}
                          {notification.type === 'GENERAL' && (
                            <AlertCircle className="w-5 h-5 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={`font-medium text-sm ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                            {notification.title}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            {notification.clientName && (
                              <span className="text-xs text-blue-600 font-medium">
                                {notification.clientName}
                              </span>
                            )}
                            <span className={`text-xs text-gray-500 ${!notification.clientName ? 'ml-auto' : ''}`}>
                              {new Date(notification.timestamp).toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0 mt-2"></div>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}