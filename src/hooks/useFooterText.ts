import { useState, useEffect } from 'react';
import { systemSettingsService } from '@/services/supabase/systemSettingsService';

export const useFooterText = () => {
  const [footerText, setFooterText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  const loadFooterText = async () => {
    try {
      const text = await systemSettingsService.getSystemSetting('footer_text');
      setFooterText(text || '');
    } catch (error) {
      console.error('Error loading footer text:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFooterText();
  }, []);

  return { footerText, isLoading, refreshFooterText: loadFooterText };
};