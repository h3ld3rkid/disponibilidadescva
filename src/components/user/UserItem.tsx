
import React, { useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Send } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  telegram_chat_id?: string;
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
  const [isSendingTest, setIsSendingTest] = useState(false);
  const hasTelegram = !!user.telegram_chat_id;

  const handleSendTelegramTest = async () => {
    if (!user.telegram_chat_id) return;
    
    setIsSendingTest(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-telegram-notification', {
        body: {
          chatId: user.telegram_chat_id,
          message: `🔔 <b>Teste de Notificação</b>\n\nOlá ${user.name}!\n\nEsta é uma mensagem de teste enviada pelo administrador.\n\n✅ O seu Telegram está configurado corretamente!`
        }
      });

      if (error) throw error;

      toast.success(`Mensagem de teste enviada para ${user.name}`);
    } catch (error: any) {
      console.error('Error sending test notification:', error);
      toast.error('Erro ao enviar mensagem de teste');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className={`flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg gap-4 ${
      !user.active 
        ? 'bg-orange-50 border-orange-300 hover:bg-orange-100' 
        : 'hover:bg-gray-50'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
          <div className="font-medium text-gray-900 truncate">{user.name}</div>
          <div className="flex flex-wrap items-center gap-2">
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
            {/* Telegram indicator */}
            <Button
              variant="ghost"
              size="sm"
              className={`h-6 w-6 p-0 ${hasTelegram ? 'text-blue-500 hover:text-blue-600 hover:bg-blue-50' : 'text-gray-300 cursor-default hover:bg-transparent'}`}
              onClick={hasTelegram ? handleSendTelegramTest : undefined}
              disabled={isSendingTest || !hasTelegram}
              title={hasTelegram ? 'Telegram configurado - Clique para enviar teste' : 'Telegram não configurado'}
            >
              <Send className={`h-4 w-4 ${isSendingTest ? 'animate-pulse' : ''}`} />
            </Button>
          </div>
        </div>
        <div className="text-sm text-gray-500 truncate">{user.email}</div>
        <div className="text-xs text-gray-400">
          Nº Mecanográfico: {user.mechanographic_number}
        </div>
      </div>
      
      <div className="flex justify-end md:justify-start">
        <UserActions
          user={user}
          onEdit={onEdit}
          onToggleStatus={onToggleStatus}
          onToggleLateSubmission={onToggleLateSubmission}
          onResetPassword={onResetPassword}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
};

export default UserItem;
