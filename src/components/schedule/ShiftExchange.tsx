
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { shiftExchangeService, ShiftExchangeRequest } from "@/services/supabase/shiftExchangeService";
import { userService } from "@/services/supabase/userService";
import { ArrowLeftRight, Send, Check, X, Search, Info, Users } from 'lucide-react';
import { isWeekendOrHoliday, getDayType } from '@/utils/dateUtils';
import ExchangeSuccessSplash from './ExchangeSuccessSplash';
import BroadcastExchangeDialog from './BroadcastExchangeDialog';

interface User {
  id: string;
  name: string;
  email: string;
  mechanographic_number: string;
}

const ShiftExchange = () => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedShift, setRequestedShift] = useState('');
  const [offeredDate, setOfferedDate] = useState('');
  const [offeredShift, setOfferedShift] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [exchangeRequests, setExchangeRequests] = useState<ShiftExchangeRequest[]>([]);
  const [showSuccessSplash, setShowSuccessSplash] = useState(false);
  const [showBroadcastDialog, setShowBroadcastDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      const parsedUserInfo = JSON.parse(storedUser);
      setUserInfo(parsedUserInfo);
      loadUsers();
      loadExchangeRequests(parsedUserInfo.email);
    }
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await userService.getAllUsers();
      setUsers(allUsers.filter(user => user.active));
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadExchangeRequests = async (userEmail: string) => {
    try {
      const requests = await shiftExchangeService.getUserExchangeRequests(userEmail);
      setExchangeRequests(requests);
    } catch (error) {
      console.error('Error loading exchange requests:', error);
    }
  };

  const getShiftOptions = (date: string) => {
    if (!date) return [];
    
    const dayType = getDayType(date);
    
    if (dayType === 'weekday') {
      return [
        { value: 'day', label: 'Turno Diurno' },
        { value: 'overnight', label: 'Pernoite' },
      ];
    } else {
      return [
        { value: 'morning', label: 'Turno Manhã' },
        { value: 'afternoon', label: 'Turno Tarde' },
        { value: 'night', label: 'Turno Noite' },
        { value: 'overnight', label: 'Pernoite' },
      ];
    }
  };

  const getDayTypeLabel = (date: string) => {
    if (!date) return '';
    
    const dayType = getDayType(date);
    const dateObj = new Date(date);
    const dayName = dateObj.toLocaleDateString('pt-PT', { weekday: 'long' });
    
    if (dayType === 'holiday') {
      return `${dayName} (Feriado)`;
    } else if (dayType === 'weekend') {
      return `${dayName} (Fim de semana)`;
    }
    return dayName;
  };

  const filteredUsers = users.filter(user => 
    user.email !== userInfo?.email && // Exclude current user
    (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     user.mechanographic_number.includes(searchTerm))
  );

  const handleSubmitRequest = async () => {
    if (!selectedUser || !requestedDate || !requestedShift || !offeredDate || !offeredShift) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await shiftExchangeService.createExchangeRequest({
        requester_email: userInfo.email,
        requester_name: userInfo.name || userInfo.email,
        target_email: selectedUser.email,
        target_name: selectedUser.name,
        requested_date: requestedDate,
        requested_shift: requestedShift,
        offered_date: offeredDate,
        offered_shift: offeredShift,
        message: message
      });

      if (result.success) {
        // Show success splash instead of toast
        setShowSuccessSplash(true);
        
        // Reset form
        setSelectedUser(null);
        setSearchTerm('');
        setRequestedDate('');
        setRequestedShift('');
        setOfferedDate('');
        setOfferedShift('');
        setMessage('');
        
        // Reload requests
        loadExchangeRequests(userInfo.email);
      } else {
        throw new Error('Failed to create exchange request');
      }
    } catch (error) {
      console.error('Error creating exchange request:', error);
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro ao enviar o pedido.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRespondToRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    try {
      const result = await shiftExchangeService.respondToExchangeRequest(requestId, status);
      
      if (result.success) {
        toast({
          title: status === 'accepted' ? "Troca aceite" : "Troca recusada",
          description: `O pedido foi ${status === 'accepted' ? 'aceite' : 'recusado'} com sucesso.`,
        });
        
        loadExchangeRequests(userInfo.email);
      } else {
        throw new Error('Failed to respond to request');
      }
    } catch (error) {
      console.error('Error responding to request:', error);
      toast({
        title: "Erro ao responder",
        description: "Ocorreu um erro ao responder ao pedido.",
        variant: "destructive",
      });
    }
  };

  const handleBroadcastRequest = async (offeredDate: string, offeredShift: string, message: string) => {
    setIsSubmitting(true);

    try {
      // Get all active users except current user
      const activeUsers = users.filter(user => user.email !== userInfo.email);
      
      if (activeUsers.length === 0) {
        toast({
          title: "Sem utilizadores",
          description: "Não há outros utilizadores ativos para enviar a proposta.",
          variant: "destructive",
        });
        return;
      }

      // Create exchange request for each user
      let successCount = 0;
      let errorCount = 0;

      for (const user of activeUsers) {
        try {
          await shiftExchangeService.createExchangeRequest({
            requester_email: userInfo.email,
            requester_name: userInfo.name || userInfo.email,
            target_email: user.email,
            target_name: user.name,
            requested_date: offeredDate, // The broadcast is offering this
            requested_shift: offeredShift,
            offered_date: '', // They will provide their own
            offered_shift: '',
            message: `[PROPOSTA GERAL] ${message || 'Disponível para troca de turno'}`
          });
          successCount++;
        } catch (error) {
          console.error(`Error sending to ${user.name}:`, error);
          errorCount++;
        }
      }

      setShowBroadcastDialog(false);
      
      if (successCount > 0) {
        toast({
          title: "Proposta enviada",
          description: `Proposta enviada com sucesso para ${successCount} utilizador(es).${errorCount > 0 ? ` ${errorCount} falharam.` : ''}`,
        });
        
        // Reload requests
        loadExchangeRequests(userInfo.email);
      } else {
        toast({
          title: "Erro ao enviar",
          description: "Não foi possível enviar a proposta a nenhum utilizador.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error broadcasting exchange request:', error);
      toast({
        title: "Erro ao enviar",
        description: "Ocorreu um erro ao enviar a proposta.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getShiftTypeLabel = (shift: string) => {
    switch (shift) {
      case 'day': return 'Turno Diurno';
      case 'overnight': return 'Pernoite';
      case 'morning': return 'Turno Manhã';
      case 'afternoon': return 'Turno Tarde';
      case 'night': return 'Turno Noite';
      default: return shift;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'accepted': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'accepted': return 'Aceite';
      case 'rejected': return 'Recusado';
      default: return status;
    }
  };

  if (!userInfo) {
    return <div>A carregar...</div>;
  }

  return (
    <>
      {showSuccessSplash && (
        <ExchangeSuccessSplash onClose={() => setShowSuccessSplash(false)} />
      )}
      
      <BroadcastExchangeDialog
        open={showBroadcastDialog}
        onOpenChange={setShowBroadcastDialog}
        onSubmit={handleBroadcastRequest}
        isSubmitting={isSubmitting}
      />
      
      <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trocas de Turnos</h1>
        <p className="text-gray-600">Proponha trocas de turnos com outros utilizadores</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create new exchange request */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Nova Proposta de Troca
                </CardTitle>
                <CardDescription>
                  Propor uma troca de turno com outro utilizador
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowBroadcastDialog(true)}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4" />
                Enviar para Todos
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* User search */}
            <div className="space-y-2">
              <Label htmlFor="userSearch">Procurar Utilizador</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="userSearch"
                  placeholder="Nome, email ou número mecanográfico..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              {searchTerm && filteredUsers.length > 0 && (
                <div className="border rounded-md max-h-40 overflow-y-auto">
                  {filteredUsers.map((user) => (
                    <div
                      key={user.id}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchTerm(user.name);
                      }}
                    >
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">
                        {user.email} - {user.mechanographic_number}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedUser && (
              <>
                <div className="p-3 bg-blue-50 rounded-md">
                  <div className="font-medium">Utilizador selecionado:</div>
                  <div className="text-sm text-gray-600">
                    {selectedUser.name} - {selectedUser.mechanographic_number}
                  </div>
                </div>

                {/* What you want from them */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">O que pretende do {selectedUser.name}:</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="requestedDate">Data</Label>
                      <Input
                        id="requestedDate"
                        type="date"
                        value={requestedDate}
                        onChange={(e) => {
                          setRequestedDate(e.target.value);
                          setRequestedShift(''); // Reset shift when date changes
                        }}
                      />
                      {requestedDate && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Info className="h-3 w-3" />
                          {getDayTypeLabel(requestedDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="requestedShift">Tipo de Turno</Label>
                      <Select value={requestedShift} onValueChange={setRequestedShift}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {getShiftOptions(requestedDate).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* What you offer */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">O que oferece em troca:</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="offeredDate">Data</Label>
                      <Input
                        id="offeredDate"
                        type="date"
                        value={offeredDate}
                        onChange={(e) => {
                          setOfferedDate(e.target.value);
                          setOfferedShift(''); // Reset shift when date changes
                        }}
                      />
                      {offeredDate && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                          <Info className="h-3 w-3" />
                          {getDayTypeLabel(offeredDate)}
                        </div>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="offeredShift">Tipo de Turno</Label>
                      <Select value={offeredShift} onValueChange={setOfferedShift}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecionar" />
                        </SelectTrigger>
                        <SelectContent>
                          {getShiftOptions(offeredDate).map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="message">Mensagem (opcional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Adicione uma mensagem para explicar a troca..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleSubmitRequest}
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'A enviar...' : 'Enviar Proposta'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Exchange requests history */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Trocas</CardTitle>
            <CardDescription>
              Pedidos enviados e recebidos
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {exchangeRequests.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                Ainda não há pedidos de troca
              </p>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(() => {
                  // Group broadcast requests by requester, requested_date and requested_shift
                  const groupedRequests: { [key: string]: ShiftExchangeRequest[] } = {};
                  const regularRequests: ShiftExchangeRequest[] = [];

                  exchangeRequests.forEach(request => {
                    const isBroadcast = request.message?.includes('[PROPOSTA GERAL]');
                    if (isBroadcast && request.requester_email === userInfo.email) {
                      const key = `${request.requester_email}_${request.requested_date}_${request.requested_shift}`;
                      if (!groupedRequests[key]) {
                        groupedRequests[key] = [];
                      }
                      groupedRequests[key].push(request);
                    } else {
                      regularRequests.push(request);
                    }
                  });

                  return (
                    <>
                      {/* Show grouped broadcast requests */}
                      {Object.entries(groupedRequests).map(([key, requests]) => {
                        const firstRequest = requests[0];
                        const pendingCount = requests.filter(r => r.status === 'pending').length;
                        const acceptedCount = requests.filter(r => r.status === 'accepted').length;
                        const rejectedCount = requests.filter(r => r.status === 'rejected').length;

                        return (
                          <div key={key} className="border rounded-lg p-4 bg-blue-50">
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm">
                                <span className="font-medium">Proposta Geral Enviada</span>
                                <div className="text-xs text-gray-500 mt-1">
                                  {requests.length} utilizador(es) • {pendingCount} pendente(s) • {acceptedCount} aceite(s) • {rejectedCount} recusado(s)
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>
                                <strong>Necessita de troca dia:</strong> {getShiftTypeLabel(firstRequest.requested_shift)} em{' '}
                                {new Date(firstRequest.requested_date).toLocaleDateString('pt-PT')}
                                <span className="text-xs text-gray-400 ml-1">
                                  ({getDayTypeLabel(firstRequest.requested_date)})
                                </span>
                              </div>
                              {firstRequest.message && (
                                <div className="mt-2">
                                  <strong>Mensagem:</strong> {firstRequest.message.replace('[PROPOSTA GERAL] ', '')}
                                </div>
                              )}
                            </div>
                            
                            <div className="text-xs text-gray-400 mt-2">
                              {new Date(firstRequest.created_at).toLocaleDateString('pt-PT')} às{' '}
                              {new Date(firstRequest.created_at).toLocaleTimeString('pt-PT')}
                            </div>
                          </div>
                        );
                      })}

                      {/* Show regular requests */}
                      {regularRequests.map((request) => {
                        const isBroadcast = !request.offered_date || request.offered_date === '';
                        
                        return (
                          <div key={request.id} className="border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div className="text-sm">
                                {request.requester_email === userInfo.email ? (
                                  <span className="font-medium">Enviado para: {request.target_name}</span>
                                ) : (
                                  <span className="font-medium">Recebido de: {request.requester_name}</span>
                                )}
                              </div>
                              <span className={`text-xs font-medium ${getStatusColor(request.status)}`}>
                                {getStatusLabel(request.status)}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600 space-y-1">
                              <div>
                                <strong>{isBroadcast ? 'Necessita de troca dia:' : 'Pretende:'}</strong> {getShiftTypeLabel(request.requested_shift)} em{' '}
                                {new Date(request.requested_date).toLocaleDateString('pt-PT')}
                                <span className="text-xs text-gray-400 ml-1">
                                  ({getDayTypeLabel(request.requested_date)})
                                </span>
                              </div>
                              {!isBroadcast && (
                                <div>
                                  <strong>Oferece:</strong> {getShiftTypeLabel(request.offered_shift)} em{' '}
                                  {new Date(request.offered_date).toLocaleDateString('pt-PT')}
                                  <span className="text-xs text-gray-400 ml-1">
                                    ({getDayTypeLabel(request.offered_date)})
                                  </span>
                                </div>
                              )}
                              {request.message && (
                                <div className="mt-2">
                                  <strong>Mensagem:</strong> {request.message.replace('[PROPOSTA GERAL] ', '')}
                                </div>
                              )}
                            </div>
                            
                            {request.target_email === userInfo.email && request.status === 'pending' && (
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  onClick={() => handleRespondToRequest(request.id, 'accepted')}
                                  className="flex items-center gap-1"
                                >
                                  <Check className="h-3 w-3" />
                                  Aceitar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRespondToRequest(request.id, 'rejected')}
                                  className="flex items-center gap-1"
                                >
                                  <X className="h-3 w-3" />
                                  Recusar
                                </Button>
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-400 mt-2">
                              {new Date(request.created_at).toLocaleDateString('pt-PT')} às{' '}
                              {new Date(request.created_at).toLocaleTimeString('pt-PT')}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
};

export default ShiftExchange;
