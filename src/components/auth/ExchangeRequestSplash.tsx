
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight, Check, X, Clock } from 'lucide-react';
import { shiftExchangeService, ShiftExchangeRequest } from "@/services/supabase/shiftExchangeService";
import { useToast } from "@/hooks/use-toast";

interface ExchangeRequestSplashProps {
  userEmail: string;
  onClose: () => void;
}

const ExchangeRequestSplash: React.FC<ExchangeRequestSplashProps> = ({ userEmail, onClose }) => {
  const [requests, setRequests] = useState<ShiftExchangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingRequests();
  }, [userEmail]);

  const loadPendingRequests = async () => {
    try {
      const pendingRequests = await shiftExchangeService.getPendingRequestsForUser(userEmail);
      setRequests(pendingRequests);
    } catch (error) {
      console.error('Error loading pending requests:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponse = async (requestId: string, status: 'accepted' | 'rejected') => {
    setProcessingId(requestId);
    try {
      const result = await shiftExchangeService.respondToExchangeRequest(requestId, status);
      
      if (result.success) {
        toast({
          title: status === 'accepted' ? "Pedido aceite" : "Pedido rejeitado",
          description: "A resposta foi enviada com sucesso.",
        });
        
        setRequests(prev => prev.filter(req => req.id !== requestId));
      } else {
        throw new Error('Failed to respond to request');
      }
    } catch (error) {
      console.error('Error responding to exchange request:', error);
      toast({
        title: "Erro",
        description: "Erro ao responder ao pedido. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', { 
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
  };

  const formatShift = (shift: string) => {
    const shiftMap: Record<string, string> = {
      'day': 'Diurno',
      'overnight': 'Pernoite',
      'morning': 'Manhã',
      'afternoon': 'Tarde',
      'night': 'Noite'
    };
    return shiftMap[shift] || shift;
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">A verificar pedidos de troca...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ArrowLeftRight className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-xl">Pedidos de Troca Pendentes</CardTitle>
          </div>
          <CardDescription>
            Tem {requests.length} pedido{requests.length > 1 ? 's' : ''} de troca pendente{requests.length > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-lg">{request.requester_name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="h-3 w-3" />
                    {formatDate(request.created_at)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded">
                  <div className="text-sm text-blue-700 font-medium">Pretende de si:</div>
                  <div className="text-sm">
                    {formatShift(request.requested_shift)} - {formatDate(request.requested_date)}
                  </div>
                </div>
                
                <div className="bg-green-50 p-3 rounded">
                  <div className="text-sm text-green-700 font-medium">Oferece em troca:</div>
                  <div className="text-sm">
                    {formatShift(request.offered_shift)} - {formatDate(request.offered_date)}
                  </div>
                </div>
              </div>
              
              {request.message && (
                <div className="bg-white p-3 rounded border mb-4">
                  <div className="text-sm text-gray-700 font-medium mb-1">Mensagem:</div>
                  <div className="text-sm text-gray-600">{request.message}</div>
                </div>
              )}
              
              <div className="flex gap-3">
                <Button
                  onClick={() => handleResponse(request.id, 'accepted')}
                  disabled={processingId === request.id}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {processingId === request.id ? 'A processar...' : 'Aceitar'}
                </Button>
                <Button
                  onClick={() => handleResponse(request.id, 'rejected')}
                  disabled={processingId === request.id}
                  variant="destructive"
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" />
                  {processingId === request.id ? 'A processar...' : 'Recusar'}
                </Button>
              </div>
            </div>
          ))}
          
          <div className="flex justify-center pt-4">
            <Button variant="outline" onClick={onClose}>
              Ver mais tarde
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExchangeRequestSplash;
