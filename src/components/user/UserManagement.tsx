
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserForm from './UserForm';
import UserSubmissionSettings from '../admin/UserSubmissionSettings';
import { Users, UserPlus, Settings } from 'lucide-react';

const UserManagement = () => {
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
              <UserForm />
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
