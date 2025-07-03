
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bell, X, Check, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { shiftExchangeService } from "@/services/supabase/shiftExchangeService";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ExchangeNotificationsProps {
  userEmail: string;
}

const ExchangeNotifications: React.FC<ExchangeNotificationsProps> = ({ userEmail }) => {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processedRequests, setProcessedRequests] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const loadExchangeRequests = useCallback(async () => {
    if (isLoading) return; // Prevent multiple simultaneous requests
    
    try {
      setIsLoading(true);
      const pendingRequests = await shiftExchangeService.getPendingRequestsForUser(userEmail);
      setRequests(pendingRequests);
    } catch (error) {
      console.error('Error loading exchange requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userEmail, isLoading]);

  useEffect(() => {
    loadExchangeRequests();
    
    // Set up polling with exponential backoff
    let pollCount = 0;
    const maxPollInterval = 120000; // 2 minutes max
    
    const poll = () => {
      const interval = Math.min(30000 * Math.pow(1.5, pollCount), maxPollInterval);
      pollCount++;
      
      setTimeout(() => {
        loadExchangeRequests();
        if (requests.length > 0) {
          pollCount = 0; // Reset if there are active requests
        }
        poll();
      }, interval);
    };
    
    const timeoutId = setTimeout(poll, 30000);
    
    return () => clearTimeout(timeoutId);
  }, [userEmail, loadExchangeRequests, requests.length]);

  // Memoized toast notifications to prevent duplicates
  const newRequests = useMemo(() => {
    return requests.filter(request => !processedRequests.has(request.id));
  }, [requests, processedRequests]);

  useEffect(() => {
    newRequests.forEach(request => {
      setProcessedRequests(prev => new Set(prev).add(request.id));
      
      toast({
        title: "Novo pedido de troca",
        description: `${request.requester_name} quer trocar turnos consigo`,
        duration: 5000,
      });
    });
  }, [newRequests, toast]);

  const handleResponse = useCallback(async (requestId: string, status: 'accepted' | 'rejected') => {
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
    }
  }, [toast]);

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-PT', { 
      day: 'numeric', 
      month: 'short' 
    });
  }, []);

  const formatShift = useCallback((shift: string) => {
    const shiftMap: Record<string, string> = {
      'day': 'Diurno',
      'overnight': 'Pernoite',
      'morning': 'Manhã',
      'afternoon': 'Tarde',
      'night': 'Noite'
    };
    return shiftMap[shift] || shift;
  }, []);

  if (requests.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {requests.length > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {requests.length}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-white">
        <div className="p-3 border-b">
          <h3 className="font-semibold text-sm">Pedidos de Troca</h3>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {requests.map((request, index) => (
            <React.Fragment key={request.id}>
              <div className="p-3 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{request.requester_name}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      <div>Quer: {formatShift(request.requested_shift)} - {formatDate(request.requested_date)}</div>
                      <div>Oferece: {formatShift(request.offered_shift)} - {formatDate(request.offered_date)}</div>
                    </div>
                    {request.message && (
                      <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-2 rounded">
                        {request.message}
                      </p>
                    )}
                  </div>
                  <Clock className="h-4 w-4 text-gray-400 mt-1" />
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    onClick={() => handleResponse(request.id, 'accepted')}
                    disabled={isLoading}
                    className="flex-1 h-8 text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Aceitar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleResponse(request.id, 'rejected')}
                    disabled={isLoading}
                    className="flex-1 h-8 text-xs"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Rejeitar
                  </Button>
                </div>
              </div>
              
              {index < requests.length - 1 && <DropdownMenuSeparator />}
            </React.Fragment>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default React.memo(ExchangeNotifications);
