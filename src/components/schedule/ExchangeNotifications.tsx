
import React, { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { shiftExchangeService, ShiftExchangeRequest } from "@/services/supabase/shiftExchangeService";

interface ExchangeNotificationsProps {
  userEmail: string;
}

const ExchangeNotifications: React.FC<ExchangeNotificationsProps> = ({ userEmail }) => {
  const [pendingRequests, setPendingRequests] = useState<ShiftExchangeRequest[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingRequests();
    
    // Set up real-time subscription
    const unsubscribe = shiftExchangeService.setupRealtimeSubscription(userEmail, () => {
      console.log("New exchange request notification received");
      loadPendingRequests();
    });
    
    return () => {
      unsubscribe();
    };
  }, [userEmail]);

  const loadPendingRequests = async () => {
    try {
      const requests = await shiftExchangeService.getPendingRequestsForUser(userEmail);
      setPendingRequests(requests);
      
      // Auto-show dialog if there are new pending requests
      if (requests.length > 0 && !showDialog) {
        setShowDialog(true);
      }
    } catch (error) {
      console.error('Error loading pending requests:', error);
    }
  };

  const handleResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
    setIsLoading(true);
    
    try {
      const result = await shiftExchangeService.respondToExchangeRequest(requestId, status);
      
      if (result.success) {
        toast({
          title: status === 'accepted' ? "Troca aceite" : "Troca recusada",
          description: `O pedido foi ${status === 'accepted' ? 'aceite' : 'recusado'} com sucesso.`,
        });
        
        // Remove from pending list
        setPendingRequests(prev => prev.filter(req => req.id !== requestId));
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
    } finally {
      setIsLoading(false);
    }
  };

  const getShiftTypeLabel = (shift: string) => {
    switch (shift) {
      case 'day': return 'Turno Diurno';
      case 'overnight': return 'Pernoite';
      default: return shift;
    }
  };

  return (
    <>
      {/* Notification Bell Icon */}
      {pendingRequests.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowDialog(true)}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs"
          >
            {pendingRequests.length}
          </Badge>
        </Button>
      )}

      {/* Notifications Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Pedidos de Troca Pendentes
            </DialogTitle>
            <DialogDescription>
              Tem {pendingRequests.length} pedido{pendingRequests.length !== 1 ? 's' : ''} de troca pendente{pendingRequests.length !== 1 ? 's' : ''}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {pendingRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    Pedido de {request.requester_name}
                  </CardTitle>
                  <CardDescription>
                    Recebido em {new Date(request.created_at).toLocaleDateString('pt-PT')} às{' '}
                    {new Date(request.created_at).toLocaleTimeString('pt-PT')}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">O que {request.requester_name} pretende:</h4>
                      <p className="text-sm text-blue-800">
                        {getShiftTypeLabel(request.requested_shift)} em{' '}
                        {new Date(request.requested_date).toLocaleDateString('pt-PT', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-900 mb-2">O que oferece em troca:</h4>
                      <p className="text-sm text-green-800">
                        {getShiftTypeLabel(request.offered_shift)} em{' '}
                        {new Date(request.offered_date).toLocaleDateString('pt-PT', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  {request.message && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-2">Mensagem:</h4>
                      <p className="text-sm text-gray-700">{request.message}</p>
                    </div>
                  )}
                  
                  <div className="flex gap-3 pt-2">
                    <Button
                      onClick={() => handleResponse(request.id, 'accepted')}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <Check className="h-4 w-4" />
                      Aceitar Troca
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleResponse(request.id, 'rejected')}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <X className="h-4 w-4" />
                      Recusar Troca
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ExchangeNotifications;
