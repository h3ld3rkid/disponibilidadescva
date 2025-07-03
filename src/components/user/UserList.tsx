
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/supabase/userService";
import { Users, Edit, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import UserEditDialog from './UserEditDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  name: string;
  email: string;
  mechanographic_number: string;
  role: 'admin' | 'user';
  active: boolean;
  needs_password_change?: boolean;
  allow_late_submission?: boolean;
}

interface UserListProps {
  users: User[];
  onUserUpdated: () => void;
  onUserDeleted: (deletedUserEmail: string) => void;
  onUserStatusToggled: () => void;
}

const UserList: React.FC<UserListProps> = ({ 
  users, 
  onUserUpdated, 
  onUserDeleted, 
  onUserStatusToggled 
}) => {
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const handleDeleteUser = async (userId: string) => {
    try {
      const result = await userService.deleteUser(userId);
      
      if (result.success) {
        if (result.email) {
          onUserDeleted(result.email);
        }
        toast({
          title: "Utilizador eliminado",
          description: "O utilizador foi eliminado com sucesso.",
        });
      } else {
        throw new Error(result.message || "Failed to delete user");
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Erro ao eliminar",
        description: "Não foi possível eliminar o utilizador.",
        variant: "destructive",
      });
    }
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const result = await userService.toggleUserStatus(userId);
      
      if (result.success) {
        onUserStatusToggled();
        toast({
          title: "Estado atualizado",
          description: `Utilizador ${result.active ? 'ativado' : 'desativado'} com sucesso.`,
        });
      } else {
        throw new Error("Failed to toggle user status");
      }
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o estado do utilizador.",
        variant: "destructive",
      });
    }
  };

  const handleToggleLateSubmission = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const updatedUser = await userService.updateUser(userId, {
        allow_late_submission: !user.allow_late_submission
      });

      onUserUpdated();
      toast({
        title: "Permissão atualizada",
        description: `Submissão após dia 15 ${updatedUser.allow_late_submission ? 'permitida' : 'bloqueada'}.`,
      });
    } catch (error) {
      console.error('Error toggling late submission:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a permissão.",
        variant: "destructive",
      });
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
  };

  const handleUserUpdated = () => {
    setEditingUser(null);
    onUserUpdated();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Lista de Utilizadores
          </CardTitle>
          <CardDescription>
            Gerir utilizadores existentes do sistema
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
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <Badge variant={user.active ? "default" : "secondary"}>
                        {user.active ? "Ativo" : "Inativo"}
                      </Badge>
                      <Badge variant={user.role === "admin" ? "destructive" : "outline"}>
                        {user.role === "admin" ? "Administrador" : "Utilizador"}
                      </Badge>
                      {user.allow_late_submission && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Submissão Tardia
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-400">
                      Nº Mecanográfico: {user.mechanographic_number}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleUserStatus(user.id)}
                    >
                      {user.active ? (
                        <ToggleRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleLateSubmission(user.id)}
                      title={user.allow_late_submission ? "Desativar submissão após dia 15" : "Permitir submissão após dia 15"}
                    >
                      <span className={`text-xs ${user.allow_late_submission ? 'text-yellow-600' : 'text-gray-400'}`}>
                        15+
                      </span>
                    </Button>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Eliminar utilizador</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem a certeza que deseja eliminar o utilizador "{user.name}"? 
                            Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteUser(user.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Eliminar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {editingUser && (
        <UserEditDialog
          user={editingUser}
          open={!!editingUser}
          onClose={() => setEditingUser(null)}
          onUserUpdated={handleUserUpdated}
        />
      )}
    </div>
  );
};

export default UserList;
