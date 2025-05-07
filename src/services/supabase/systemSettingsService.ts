
import { supabase } from "@/integrations/supabase/client";

/**
 * Get a system setting by key
 * @param key The system setting key to retrieve
 * @returns The system setting value or null if not found
 */
export const getSystemSetting = async (key: string): Promise<string | null> => {
  // Use from query instead of RPC to avoid type errors
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error(`Error retrieving system setting ${key}:`, error);
    return null;
  }

  return data?.value || null;
};

/**
 * Update or insert a system setting
 * @param key The system setting key
 * @param value The system setting value
 * @param description Optional description for the setting
 * @returns Success status
 */
export const upsertSystemSetting = async (
  key: string,
  value: string,
  description?: string
): Promise<boolean> => {
  // Use upsert operation instead of RPC to avoid type errors
  const { error } = await supabase
    .from('system_settings')
    .upsert({
      key,
      value,
      description: description || null,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'key'
    });

  if (error) {
    console.error(`Error upserting system setting ${key}:`, error);
    return false;
  }

  return true;
};

export const systemSettingsService = {
  getSystemSetting,
  upsertSystemSetting,
};
