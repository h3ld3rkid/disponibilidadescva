import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, RefreshCw, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  formatScheduleTelegramMessage,
  type ScheduleSubmissionData,
} from '@/services/telegramScheduleFormatter';

interface TelegramUser {
  email: string;
  name: string;
  telegram_chat_id: string;
}

const TelegramNotificationTest: React.FC = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string>('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [sending, setSending] = useState(false);
  const [scheduleMonth, setScheduleMonth] = useState<string | undefined>();
  const [scheduleData, setScheduleData] = useState<ScheduleSubmissionData | null>(null);
  const [attempt, setAttempt] = useState<number | undefined>();
  const [message, setMessage] = useState('');

  const selectedUser = useMemo(
    () => users.find(u => u.email === selectedEmail),
    [users, selectedEmail],
  );

  useEffect(() => {
    (async () => {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('users')
        .select('email, name, telegram_chat_id')
        .not('telegram_chat_id', 'is', null)
        .order('name');
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      } else {
        setUsers((data || []) as TelegramUser[]);
      }
      setLoadingUsers(false);
    })();
  }, [toast]);

  const loadLatestSchedule = async (email: string) => {
    setLoadingSchedule(true);
    setScheduleData(null);
    setScheduleMonth(undefined);
    setAttempt(undefined);
    const { data, error } = await supabase
      .from('schedules')
      .select('month, dates, edit_count')
      .eq('user_email', email)
      .order('month', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      toast({ title: 'Erro ao carregar escala', description: error.message, variant: 'destructive' });
    } else if (data) {
      setScheduleMonth(data.month as string);
      setScheduleData(data.dates as ScheduleSubmissionData);
      setAttempt((data.edit_count as number) || 1);
    }
    setLoadingSchedule(false);
  };

  useEffect(() => {
    if (selectedEmail) loadLatestSchedule(selectedEmail);
  }, [selectedEmail]);

  useEffect(() => {
    if (!selectedUser) {
      setMessage('');
      return;
    }
    if (!scheduleData) {
      setMessage(
        formatScheduleTelegramMessage(
          selectedUser.name,
          scheduleMonth,
          { shifts: [], overnights: [] },
        ),
      );
      return;
    }
    setMessage(
      formatScheduleTelegramMessage(selectedUser.name, scheduleMonth, scheduleData, attempt),
    );
  }, [selectedUser, scheduleData, scheduleMonth, attempt]);

  const handleSend = async () => {
    if (!selectedUser || !message.trim()) return;
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-telegram-notification', {
        body: { chatId: selectedUser.telegram_chat_id, message },
      });
      if (error) throw error;
      toast({
        title: 'Enviado',
        description: `Mensagem de teste enviada para ${selectedUser.name}.`,
      });
    } catch (err) {
      toast({
        title: 'Erro ao enviar',
        description: err instanceof Error ? err.message : 'Falha desconhecida',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Teste — Notificação Telegram (Escala Submetida)</h1>
        <p className="text-muted-foreground">
          Pré-visualize e envie a nova mensagem detalhada para um utilizador com Telegram configurado.
        </p>
      </div>

      <Alert className="mb-6">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Esta é uma secção de testes. A pré-visualização usa a <b>última escala submetida</b> do utilizador escolhido.
          Depois de validares o formato, aplicamos esta mesma mensagem à submissão real da escala.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Pré-visualização</CardTitle>
          <CardDescription>
            Só aparecem utilizadores com Telegram ligado ({users.length}).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Utilizador</Label>
            <Select
              value={selectedEmail}
              onValueChange={setSelectedEmail}
              disabled={loadingUsers || users.length === 0}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingUsers
                      ? 'A carregar...'
                      : users.length === 0
                        ? 'Nenhum utilizador com Telegram configurado'
                        : 'Selecionar utilizador'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.email} value={u.email}>
                    {u.name} — {u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedEmail && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {loadingSchedule ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> A carregar última escala...</>
              ) : scheduleData ? (
                <>
                  <span>
                    Escala carregada: <b>{scheduleMonth}</b> · {(scheduleData.shifts?.length || 0)} turnos, {(scheduleData.overnights?.length || 0)} pernoites · tentativa {attempt}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => loadLatestSchedule(selectedEmail)}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <span>Utilizador ainda não tem escala submetida. A pré-visualizar mensagem vazia.</span>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Mensagem (HTML — podes editar antes de enviar)</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={16}
              className="font-mono text-sm"
              placeholder="Escolhe um utilizador para gerar a pré-visualização..."
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => selectedEmail && loadLatestSchedule(selectedEmail)}
              disabled={!selectedEmail || loadingSchedule}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerar pré-visualização
            </Button>
            <Button onClick={handleSend} disabled={!selectedUser || !message.trim() || sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'A enviar...' : 'Enviar teste para o Telegram'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramNotificationTest;
