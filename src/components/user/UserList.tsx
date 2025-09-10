
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { userService } from "@/services/supabase/userService";
import { authService } from "@/services/supabase/authService";
import { Users, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';
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
  const [sortOrder, setSortOrder] = useState<'none' | 'asc' | 'desc'>('none');
  const { toast } = useToast();

  const sortedUsers = useMemo(() => {
    if (sortOrder === 'none') return users;
    
    return [...users].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB, 'pt-PT');
      } else {
        return nameB.localeCompare(nameA, 'pt-PT');
      }
    });
  }, [users, sortOrder]);

  const handleSortToggle = () => {
    setSortOrder(current => {
      if (current === 'none') return 'asc';
      if (current === 'asc') return 'desc';
      return 'none';
    });
  };

  const getSortIcon = () => {
    if (sortOrder === 'asc') return <ArrowUpAZ className="h-4 w-4" />;
    if (sortOrder === 'desc') return <ArrowDownAZ className="h-4 w-4" />;
    return <ArrowUpAZ className="h-4 w-4 opacity-50" />;
  };

  const getSortLabel = () => {
    if (sortOrder === 'asc') return 'A-Z';
    if (sortOrder === 'desc') return 'Z-A';
    return 'Ordenar';
  };

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
          description: `A password do utilizador foi reposta para "${result.temporaryPassword}".`,
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-6 w-6" />
                Lista de Utilizadores
              </CardTitle>
              <CardDescription>
                Gerir utilizadores existentes do sistema
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSortToggle}
              className="flex items-center gap-2"
            >
              {getSortIcon()}
              {getSortLabel()}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedUsers.length === 0 ? (
              <EmptyUserList />
            ) : (
              sortedUsers.map((user) => (
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
