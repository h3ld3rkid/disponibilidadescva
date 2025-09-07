import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { MessageSquare, CheckCircle, AlertCircle, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface TelegramSetupProps {
  userEmail: string;
  currentChatId?: string;
  userRole?: string;
  onUpdate?: () => void;
}

export const TelegramSetup: React.FC<TelegramSetupProps> = ({ 
  userEmail, 
  currentChatId, 
  userRole,
  onUpdate 
}) => {
  const [chatId, setChatId] = useState(currentChatId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const [isWebhookLoading, setIsWebhookLoading] = useState(false);
  const { toast } = useToast();

  const BOT_USERNAME = '@cvamares_bot';

  const copyBotLink = () => {
    navigator.clipboard.writeText('https://t.me/cvamares_bot');
    toast({
      title: "Link copiado",
      description: "O link do bot foi copiado para a área de transferência",
    });
  };

  const handleSave = async () => {
    if (!chatId.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, insira o Chat ID do Telegram",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ telegram_chat_id: chatId.trim() })
        .eq('email', userEmail);

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: "Chat ID do Telegram guardado com sucesso!",
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error saving telegram chat ID:', error);
      toast({
        title: "Erro",
        description: "Erro ao guardar o Chat ID do Telegram",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestNotification = async () => {
    if (!chatId.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, guarde primeiro o Chat ID do Telegram",
        variant: "destructive",
      });
      return;
    }

    setIsTestLoading(true);
    try {
      const { error } = await supabase.functions.invoke('send-telegram-notification', {
        body: {
          chatId: chatId.trim(),
          message: `🧪 <b>Teste de Notificação</b>\n\nOlá! Esta é uma mensagem de teste do sistema de notificações da Cruz Vermelha de Amares.\n\n✅ O seu Telegram está configurado corretamente!`
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Teste enviado",
        description: "Verifique o seu Telegram para confirmar que recebeu a mensagem de teste",
      });
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Erro no teste",
        description: "Erro ao enviar mensagem de teste. Verifique o Chat ID.",
        variant: "destructive",
      });
    } finally {
      setIsTestLoading(false);
    }
  };

  const handleRemove = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ telegram_chat_id: null })
        .eq('email', userEmail);

      if (error) {
        throw error;
      }

      setChatId('');
      toast({
        title: "Removido",
        description: "Configuração do Telegram removida com sucesso",
      });

      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error removing telegram chat ID:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover a configuração do Telegram",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupWebhook = async () => {
    setIsWebhookLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('setup-telegram-webhook');

      if (error) {
        throw error;
      }

      if (data.success) {
        toast({
          title: "Webhook configurado",
          description: "O webhook do Telegram foi configurado com sucesso!",
        });
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Error setting up webhook:', error);
      toast({
        title: "Erro no webhook",
        description: "Erro ao configurar o webhook do Telegram",
        variant: "destructive",
      });
    } finally {
      setIsWebhookLoading(false);
    }
  };

  useEffect(() => {
    setChatId(currentChatId || '');
  }, [currentChatId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          Notificações Telegram
        </CardTitle>
        <CardDescription>
          Configure as notificações via Telegram para receber avisos de trocas de turno
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          {currentChatId ? (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" />
              <Badge variant="secondary" className="bg-green-50 text-green-700">
                Configurado
              </Badge>
            </>
          ) : (
            <>
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <Badge variant="secondary" className="bg-orange-50 text-orange-700">
                Não configurado
              </Badge>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-4 rounded-lg space-y-3">
          <h4 className="font-semibold text-blue-900">Como configurar:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
            <li>
              Abra o bot do Telegram:
              <div className="flex items-center gap-2 mt-1">
                <code className="bg-white px-2 py-1 rounded text-xs">{BOT_USERNAME}</code>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={copyBotLink}
                  className="h-6 px-2"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </li>
            <li>Envie <code className="bg-white px-1 rounded">/start</code> para o bot</li>
            <li>O bot responderá com o seu Chat ID</li>
            <li>Cole o Chat ID no campo abaixo e guarde</li>
          </ol>
          
          {userRole === 'admin' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h5 className="font-semibold text-yellow-800 text-sm mb-2">
                ⚙️ Configuração do Bot (Para Administradores)
              </h5>
              <div className="text-xs text-yellow-700 space-y-1">
                <p><strong>Webhook URL:</strong></p>
                <code className="bg-white px-2 py-1 rounded text-xs block mt-1">
                  https://lddfufxcrnqixfiyhrvc.supabase.co/functions/v1/telegram-bot-webhook
                </code>
                <p className="mt-2">Configure este URL como webhook no @BotFather usando:</p>
                <code className="bg-white px-2 py-1 rounded text-xs block mt-1">
                  /setwebhook
                </code>
                <div className="mt-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSetupWebhook}
                    disabled={isWebhookLoading}
                    className="bg-white text-yellow-800 border-yellow-300 hover:bg-yellow-50"
                  >
                    {isWebhookLoading ? 'A configurar...' : 'Configurar Webhook Automaticamente'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat ID Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Chat ID do Telegram</label>
          <Input
            value={chatId}
            onChange={(e) => setChatId(e.target.value)}
            placeholder="ex: 123456789"
            disabled={isLoading}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={isLoading || !chatId.trim()}
            className="flex-1"
          >
            {isLoading ? 'A guardar...' : 'Guardar'}
          </Button>
          
          {currentChatId && (
            <>
              <Button 
                variant="outline" 
                onClick={handleTestNotification}
                disabled={isTestLoading}
              >
                {isTestLoading ? 'A testar...' : 'Testar'}
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={handleRemove}
                disabled={isLoading}
              >
                Remover
              </Button>
            </>
          )}
        </div>

        {/* Help */}
        <div className="text-xs text-muted-foreground">
          💡 <strong>Dica:</strong> Receberá notificações sempre que alguém lhe solicitar uma troca de turno
        </div>
      </CardContent>
    </Card>
  );
};