
import React from 'react';
import { Button } from "@/components/ui/button";
import { Edit, ToggleLeft, ToggleRight, RotateCcw, Trash2 } from 'lucide-react';
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

interface UserActionsProps {
  user: User;
  onEdit: (user: User) => void;
  onToggleStatus: (userId: string) => void;
  onToggleLateSubmission: (userId: string) => void;
  onResetPassword: (userEmail: string) => void;
  onDelete: (userId: string) => void;
}

const UserActions: React.FC<UserActionsProps> = ({
  user,
  onEdit,
  onToggleStatus,
  onToggleLateSubmission,
  onResetPassword,
  onDelete
}) => {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onEdit(user)}
      >
        <Edit className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onToggleStatus(user.id)}
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
        onClick={() => onToggleLateSubmission(user.id)}
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
            title="Repor password para CVAmares"
          >
            <RotateCcw className="h-4 w-4 text-blue-600" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Repor password</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que deseja repor a password do utilizador "{user.name}" para "CVAmares"? 
              O utilizador terá de alterar a password no próximo login.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => onResetPassword(user.email)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Repor Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              onClick={() => onDelete(user.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserActions;
