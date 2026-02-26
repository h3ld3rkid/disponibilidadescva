import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

interface TabVisibility {
  tab_key: string;
  visible: boolean;
}

export const useTabVisibility = () => {
  const [hiddenTabs, setHiddenTabs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('tab_visibility')
        .select('tab_key, visible');
      
      const hidden = new Set<string>();
      (data || []).forEach((t: TabVisibility) => {
        if (!t.visible) hidden.add(t.tab_key);
      });
      setHiddenTabs(hidden);
      setLoading(false);
    };
    load();
  }, []);

  const isTabVisible = (tabKey: string) => !hiddenTabs.has(tabKey);

  return { isTabVisible, loading };
};
