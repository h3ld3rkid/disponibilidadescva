import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TabVisibility {
  id: string;
  tab_key: string;
  tab_label: string;
  visible: boolean;
}

const TabVisibilityConfig: React.FC = () => {
  const [tabs, setTabs] = useState<TabVisibility[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTabs();
  }, []);

  const loadTabs = async () => {
    const { data, error } = await supabase
      .from('tab_visibility')
      .select('*')
      .order('tab_label');
    
    if (error) {
      console.error('Error loading tabs:', error);
      toast({ title: "Erro ao carregar abas", variant: "destructive" });
    } else {
      setTabs(data || []);
    }
    setLoading(false);
  };

  const toggleVisibility = async (tab: TabVisibility) => {
    const newVisible = !tab.visible;
    const { error } = await supabase
      .from('tab_visibility')
      .update({ visible: newVisible, updated_at: new Date().toISOString() })
      .eq('id', tab.id);

    if (error) {
      console.error('Error updating tab:', error);
      toast({ title: "Erro ao atualizar", variant: "destructive" });
    } else {
      setTabs(prev => prev.map(t => t.id === tab.id ? { ...t, visible: newVisible } : t));
      toast({ title: `Aba "${tab.tab_label}" ${newVisible ? 'visível' : 'oculta'}` });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Visibilidade das Abas
        </CardTitle>
        <CardDescription>
          Escolha quais abas ficam visíveis para os utilizadores
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tabs.map(tab => (
            <div key={tab.id} className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor={tab.tab_key} className="text-sm font-medium cursor-pointer">
                {tab.tab_label}
              </Label>
              <Switch
                id={tab.tab_key}
                checked={tab.visible}
                onCheckedChange={() => toggleVisibility(tab)}
              />
            </div>
          ))}
          {tabs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma aba configurada.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TabVisibilityConfig;
