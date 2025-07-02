
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/supabase/userService";
import { UserCog } from 'lucide-react';
import CreateUserDialog from './CreateUserDialog';
import UserList from './UserList';

interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  mechanographic_number: string;
  role: 'admin' | 'user';
  active: boolean;
  needs_password_change?: boolean;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { toast } = useToast();

  const loadUsers = async () => {
    try {
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: "Erro ao carregar utilizadores",
        description: "Ocorreu um erro ao carregar a lista de utilizadores.",
        variant: "destructive",
      });
    }
  };

  const handleUserCreated = () => {
    loadUsers();
  };

  const handleUserUpdated = () => {
    loadUsers();
  };
  
  const handleUserDeleted = (deletedUserEmail: string) => {
    setUsers(prevUsers => prevUsers.filter(user => user.email !== deletedUserEmail));
  };

  const handleUserStatusToggled = () => {
    loadUsers();
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestão de Utilizadores</h1>
        <p className="text-gray-600">Gerir utilizadores do sistema</p>
      </div>

      <div className="space-y-6">
        {/* Create User Button */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Criar Utilizador
            </CardTitle>
            <CardDescription>
              Adicionar novos utilizadores ao sistema
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <CreateUserDialog onUserCreated={handleUserCreated} />
          </CardContent>
        </Card>
        
        {/* User List */}
        <UserList 
          users={users}
          onUserUpdated={handleUserUpdated}
          onUserDeleted={handleUserDeleted}
          onUserStatusToggled={handleUserStatusToggled}
        />
      </div>
    </div>
  );
};

export default UserManagement;
