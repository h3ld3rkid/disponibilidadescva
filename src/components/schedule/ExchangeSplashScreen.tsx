
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
      console.log('=== EXCHANGE SPLASH SCREEN ===');
      console.log('Loading pending requests for user:', userEmail);
      try {
        const requests = await shiftExchangeService.getPendingRequestsForUser(userEmail);
        console.log('Found pending requests:', requests.length);
        setPendingCount(requests.length);
      } catch (error) {
        console.error('Error loading pending requests:', error);
        setPendingCount(0);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) {
      loadPendingRequests();
    } else {
      console.log('No userEmail provided to ExchangeSplashScreen');
      setLoading(false);
    }
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-10 max-w-lg w-full mx-4 text-center relative shadow-2xl animate-scale-in border-2 border-red-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="absolute top-4 right-4 hover:bg-red-50"
        >
          <X className="h-5 w-5" />
        </Button>
        
        <div className="mb-8">
          <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <ArrowLeftRight className="h-12 w-12 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            🔄 Novos Pedidos de Troca!
          </h2>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-lg text-red-800 font-semibold">
              Tem {pendingCount} pedido{pendingCount > 1 ? 's' : ''} de troca de turno pendente{pendingCount > 1 ? 's' : ''} à sua espera.
            </p>
          </div>
          
          <p className="text-gray-600">
            ⏰ Responda o mais breve possível para confirmar ou rejeitar as trocas.
          </p>
        </div>
        
        <div className="space-y-4">
          <Button 
            onClick={handleViewExchanges}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
            size="lg"
          >
            👀 Ver Pedidos de Troca
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleClose}
            className="w-full border-2 border-gray-300 hover:bg-gray-50 py-3"
            size="lg"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeSplashScreen;
