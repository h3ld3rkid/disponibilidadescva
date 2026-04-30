import { useState, useEffect } from 'react';
import { systemSettingsService } from '@/services/supabase/systemSettingsService';

const DEFAULT_LOGO = 'https://amares.cruzvermelha.pt/images/site/Amares.webp';

export const useLogoUrl = () => {
  const [logoUrl, setLogoUrl] = useState<string>(DEFAULT_LOGO);
  const [isLoading, setIsLoading] = useState(true);

  const loadLogo = async () => {
    try {
      const url = await systemSettingsService.getSystemSetting('logo_url');
      setLogoUrl(url && url.trim() ? url.trim() : DEFAULT_LOGO);
    } catch (e) {
      console.error('Error loading logo url:', e);
      setLogoUrl(DEFAULT_LOGO);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLogo();
  }, []);

  return { logoUrl, isLoading, refreshLogo: loadLogo, defaultLogo: DEFAULT_LOGO };
};
