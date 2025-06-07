
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserForm from './UserForm';
import UserSubmissionSettings from '../admin/UserSubmissionSettings';
import { Users, UserPlus, Settings } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/supabase/userService";

const UserManagement = () => {
  const { toast } = useToast();

  const handleCreateUser = async (userData: any) => {
    try {
      const success = await userService.createUser({
        name: userData.name,
        email: userData.email,
        mechanographic_number: userData.mechanographicNumber,
        role: userData.role,
        password: userData.password || "CVAmares"
      });

      if (success) {
        toast({
          title: "Utilizador criado",
          description: "O utilizador foi criado com sucesso.",
        });
        return true;
      } else {
        throw new Error("Failed to create user");
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: "Erro ao criar utilizador",
        description: "Não foi possível criar o utilizador.",
        variant: "destructive",
      });
      return false;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Utilizadores</h1>
        <p className="text-gray-600">Gerir utilizadores do sistema e suas permissões</p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Utilizadores
          </TabsTrigger>
          <TabsTrigger value="permissions" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Permissões de Submissão
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                Gestão de Utilizadores
              </CardTitle>
              <CardDescription>
                Adicionar, editar e remover utilizadores do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserForm onSubmit={handleCreateUser} />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="permissions">
          <UserSubmissionSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagement;
