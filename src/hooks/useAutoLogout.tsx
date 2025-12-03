import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';

export function useAutoLogout() {
  const { signOut, user } = useAuth();
  const { settings } = useSettings();
  const timeoutRef = useRef<NodeJS.Timeout>();

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (user && settings.auto_logout_minutes > 0) {
      timeoutRef.current = setTimeout(() => {
        signOut();
      }, settings.auto_logout_minutes * 60 * 1000);
    }
  };

  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [user, settings.auto_logout_minutes]);

  return { resetTimer };
}
