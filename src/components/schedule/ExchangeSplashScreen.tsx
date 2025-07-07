
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
    <div className="fixed inset-0 bg-gradient-to-br from-gray-900/90 to-black/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
      <div className="relative w-full max-w-md mx-4">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="absolute -top-12 right-0 text-white/80 hover:text-white hover:bg-white/10 z-10"
        >
          <X className="h-6 w-6" />
        </Button>
        
        {/* Main splash screen content */}
        <div className="bg-white rounded-3xl p-12 text-center shadow-2xl animate-scale-in border border-gray-100">
          {/* Icon */}
          <div className="w-28 h-28 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg animate-pulse">
            <ArrowLeftRight className="h-14 w-14 text-white" />
          </div>
          
          {/* Title */}
          <h1 className="text-4xl font-bold text-gray-900 mb-6 leading-tight">
            Pedidos de Troca
            <br />
            <span className="text-red-600">Pendentes!</span>
          </h1>
          
          {/* Count badge */}
          <div className="inline-flex items-center bg-red-100 border-2 border-red-200 rounded-full px-6 py-3 mb-6">
            <span className="text-2xl font-bold text-red-800">
              {pendingCount} {pendingCount === 1 ? 'pedido' : 'pedidos'}
            </span>
          </div>
          
          {/* Description */}
          <p className="text-lg text-gray-600 mb-8 leading-relaxed">
            Tem novos pedidos de troca de turno aguardando a sua resposta.
          </p>
          
          {/* Action buttons */}
          <div className="space-y-4">
            <Button 
              onClick={handleViewExchanges}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-6 text-xl rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
            >
              ✨ Ver Pedidos Agora
            </Button>
            
            <Button 
              variant="ghost" 
              onClick={handleClose}
              className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-50 py-4 text-lg rounded-xl transition-all duration-200"
            >
              Mais tarde
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeSplashScreen;
