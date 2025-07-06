
import React from 'react';
import { Badge } from "@/components/ui/badge";
import UserActions from './UserActions';

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

interface UserItemProps {
  user: User;
  onEdit: (user: User) => void;
  onToggleStatus: (userId: string) => void;
  onToggleLateSubmission: (userId: string) => void;
  onResetPassword: (userEmail: string) => void;
  onDelete: (userId: string) => void;
}

const UserItem: React.FC<UserItemProps> = ({
  user,
  onEdit,
  onToggleStatus,
  onToggleLateSubmission,
  onResetPassword,
  onDelete
}) => {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
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
      
      <UserActions
        user={user}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        onToggleLateSubmission={onToggleLateSubmission}
        onResetPassword={onResetPassword}
        onDelete={onDelete}
      />
    </div>
  );
};

export default UserItem;
