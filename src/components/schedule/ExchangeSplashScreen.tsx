
import React, { useState, useEffect } from 'react';
import { X, ArrowLeftRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { shiftExchangeService } from "@/services/supabase/shiftExchangeService";

interface ExchangeSplashScreenProps {
  userEmail: string;
  onDismiss: () => void;
  onViewExchanges: () => void;
}

const ExchangeSplashScreen: React.FC<ExchangeSplashScreenProps> = ({ 
  userEmail, 
  onDismiss, 
  onViewExchanges 
}) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPendingRequests = async () => {
      try {
        const requests = await shiftExchangeService.getPendingRequestsForUser(userEmail);
        setPendingCount(requests.length);
      } catch (error) {
        console.error('Error loading pending requests:', error);
        setPendingCount(0);
      } finally {
        setLoading(false);
      }
    };

    loadPendingRequests();
  }, [userEmail]);

  if (loading || pendingCount === 0) {
    return null;
  }

  const handleViewExchanges = () => {
    console.log('View exchanges clicked');
    onViewExchanges();
  };

  const handleClose = () => {
    console.log('Close splash clicked');
    onDismiss();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="absolute top-2 right-2"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className="mb-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ArrowLeftRight className="h-8 w-8 text-red-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Novos Pedidos de Troca!
          </h2>
          
          <p className="text-gray-600">
            Tem {pendingCount} pedido{pendingCount > 1 ? 's' : ''} de troca de turno pendente{pendingCount > 1 ? 's' : ''} à sua espera.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button 
            onClick={handleViewExchanges}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Ver Pedidos de Troca
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="w-full"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeSplashScreen;
