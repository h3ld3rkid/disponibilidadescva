
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/supabase/userService";
import { systemSettingsService } from "@/services/supabase/systemSettingsService";
import { Settings, Users } from 'lucide-react';

const UserSubmissionSettings = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [submissionSettings, setSubmissionSettings] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadUsersAndSettings();
  }, []);

  const loadUsersAndSettings = async () => {
    setIsLoading(true);
    try {
      // Load all users
      const usersData = await userService.getAllUsers();
      setUsers(usersData);

      // Load submission settings for each user
      const settings: Record<string, boolean> = {};
      for (const user of usersData) {
        try {
          const setting = await systemSettingsService.getSystemSetting(`allow_submission_after_15th_${user.email}`);
          settings[user.email] = setting === 'true';
        } catch (error) {
          settings[user.email] = false;
        }
      }
      setSubmissionSettings(settings);
    } catch (error) {
      console.error('Error loading users and settings:', error);
      toast({
        title: "Erro ao carregar",
        description: "Não foi possível carregar a lista de utilizadores.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSubmissionPermission = async (userEmail: string, allowed: boolean) => {
    try {
      const success = await systemSettingsService.upsertSystemSetting(
        `allow_submission_after_15th_${userEmail}`,
        allowed.toString(),
        `Allow user ${userEmail} to submit schedule after 15th of month`
      );

      if (success) {
        setSubmissionSettings(prev => ({
          ...prev,
          [userEmail]: allowed
        }));

        toast({
          title: "Permissão atualizada",
          description: `Utilizador ${allowed ? 'pode' : 'não pode'} submeter escala após dia 15.`,
        });
      } else {
        throw new Error("Failed to update permission");
      }
    } catch (error) {
      console.error('Error updating submission permission:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a permissão.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            Configurações de Submissão
          </CardTitle>
          <CardDescription>
            Configure quais utilizadores podem submeter escalas após o dia 15 do mês
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-4">
            {users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhum utilizador encontrado</p>
              </div>
            ) : (
              users.map((user) => (
                <div key={user.email} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{user.name}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-400">
                      Função: {user.role} | Nº Mecanográfico: {user.mechanographic_number}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Label 
                      htmlFor={`submission-${user.email}`} 
                      className="text-sm font-medium"
                    >
                      Submeter após dia 15
                    </Label>
                    <Switch
                      id={`submission-${user.email}`}
                      checked={submissionSettings[user.email] || false}
                      onCheckedChange={(checked) => handleToggleSubmissionPermission(user.email, checked)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserSubmissionSettings;
