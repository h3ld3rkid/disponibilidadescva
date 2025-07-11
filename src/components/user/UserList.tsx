
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/supabase/userService";
import { authService } from "@/services/supabase/authService";
import { Users } from 'lucide-react';
import UserEditDialog from './UserEditDialog';
import UserItem from './UserItem';
import EmptyUserList from './EmptyUserList';

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

  const handleResetPassword = async (userEmail: string) => {
    try {
      const result = await authService.resetPassword(userEmail);
      
      if (result.success) {
        onUserUpdated();
        toast({
          title: "Password reposta",
          description: `A password do utilizador foi reposta para "CVAmares".`,
        });
      } else {
        throw new Error("Failed to reset password");
      }
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: "Erro ao repor password",
        description: "Não foi possível repor a password do utilizador.",
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
              <EmptyUserList />
            ) : (
              users.map((user) => (
                <UserItem
                  key={user.id}
                  user={user}
                  onEdit={handleEditUser}
                  onToggleStatus={handleToggleUserStatus}
                  onToggleLateSubmission={handleToggleLateSubmission}
                  onResetPassword={handleResetPassword}
                  onDelete={handleDeleteUser}
                />
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
