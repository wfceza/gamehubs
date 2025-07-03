
import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useSecurityMonitoring() {
  const { user, session } = useAuth();

  useEffect(() => {
    if (!user || !session) return;

    let lastActivity = Date.now();
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute

    // Track user activity
    const trackActivity = () => {
      lastActivity = Date.now();
    };

    // Session timeout check
    const checkSessionTimeout = () => {
      const now = Date.now();
      if (now - lastActivity > SESSION_TIMEOUT) {
        console.log('Session timeout detected, signing out...');
        supabase.auth.signOut();
      }
    };

    // Monitor for suspicious activities
    const monitorSuspiciousActivity = () => {
      // Check for rapid requests (basic rate limiting)
      const requests = JSON.parse(localStorage.getItem('request_timestamps') || '[]');
      const now = Date.now();
      const recentRequests = requests.filter((timestamp: number) => now - timestamp < 60000); // Last minute
      
      if (recentRequests.length > 100) {
        console.warn('Suspicious activity detected: Too many requests');
        // Log security event
        supabase.rpc('log_security_event', {
          p_user_id: user.id,
          p_event_type: 'suspicious_activity',
          p_event_data: {
            type: 'rapid_requests',
            count: recentRequests.length,
            timeframe: '1_minute'
          }
        });
      }

      // Clean old timestamps
      const updatedRequests = [...recentRequests, now];
      localStorage.setItem('request_timestamps', JSON.stringify(updatedRequests));
    };

    // Add activity listeners
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(event => {
      document.addEventListener(event, trackActivity, true);
    });

    // Set up intervals
    const timeoutInterval = setInterval(checkSessionTimeout, ACTIVITY_CHECK_INTERVAL);
    const securityInterval = setInterval(monitorSuspiciousActivity, 30000); // Every 30 seconds

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, trackActivity, true);
      });
      clearInterval(timeoutInterval);
      clearInterval(securityInterval);
    };
  }, [user, session]);

  // Function to manually log security events
  const logSecurityEvent = async (eventType: string, eventData: any = {}) => {
    if (!user) return;

    try {
      await supabase.rpc('log_security_event', {
        p_user_id: user.id,
        p_event_type: eventType,
        p_event_data: eventData
      });
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  };

  return { logSecurityEvent };
}
