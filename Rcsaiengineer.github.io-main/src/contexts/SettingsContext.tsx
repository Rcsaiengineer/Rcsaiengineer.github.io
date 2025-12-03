import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface UserSettings {
  privacy_mode: boolean;
  auto_logout_minutes: number;
  theme: string;
}

interface SettingsContextType {
  settings: UserSettings;
  loading: boolean;
  updateSettings: (updates: Partial<UserSettings>) => Promise<void>;
  togglePrivacyMode: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({
    privacy_mode: false,
    auto_logout_minutes: 10,
    theme: 'dark',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
        return;
      }

      if (data) {
        setSettings({
          privacy_mode: data.privacy_mode || false,
          auto_logout_minutes: data.auto_logout_minutes || 10,
          theme: data.theme || 'dark',
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...updates,
        });

      if (error) throw error;

      setSettings(prev => ({ ...prev, ...updates }));
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  const togglePrivacyMode = () => {
    updateSettings({ privacy_mode: !settings.privacy_mode });
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, togglePrivacyMode }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
