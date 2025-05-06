
import { supabase } from "@/integrations/supabase/client";

// Define the parameter types for the RPC functions
interface GetSystemSettingParams {
  setting_key: string;
}

interface UpsertSystemSettingParams {
  setting_key: string;
  setting_value: string;
  setting_description: string | null;
}

/**
 * Get a system setting by key
 * @param key The system setting key to retrieve
 * @returns The system setting value or null if not found
 */
export const getSystemSetting = async (key: string): Promise<string | null> => {
  const { data, error } = await supabase
    .rpc<string, GetSystemSettingParams>('get_system_setting', { 
      setting_key: key 
    });

  if (error) {
    console.error(`Error retrieving system setting ${key}:`, error);
    return null;
  }

  return data;
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
  const { error } = await supabase
    .rpc<void, UpsertSystemSettingParams>('upsert_system_setting', {
      setting_key: key,
      setting_value: value,
      setting_description: description || null,
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
