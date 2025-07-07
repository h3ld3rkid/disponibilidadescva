import React, { useState, useEffect } from 'react';
import { ArrowLeftRight, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { shiftExchangeService } from "@/services/supabase/shiftExchangeService";
import { useNavigate } from 'react-router-dom';

interface ExchangeSplashScreenProps {
  userEmail: string;
  onClose: () => void;
}

const ExchangeSplashScreen: React.FC<ExchangeSplashScreenProps> = ({ 
  userEmail, 
  onClose 
}) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadPendingRequests = async () => {
      console.log('Loading pending requests for:', userEmail);
      try {
        const requests = await shiftExchangeService.getPendingRequestsForUser(userEmail);
        console.log('Found requests:', requests.length);
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
    }
  }, [userEmail]);

  const handleViewExchanges = () => {
    onClose();
    navigate('/dashboard/exchanges');
  };

  // Don't show if no pending requests
  if (loading || pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center shadow-2xl relative">
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4"
        >
          <X className="h-4 w-4" />
        </Button>
        
        {/* Icon */}
        <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <ArrowLeftRight className="h-10 w-10 text-white" />
        </div>
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Pedidos de Troca Pendentes
        </h2>
        
        {/* Count */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-lg font-semibold text-red-800">
            {pendingCount} {pendingCount === 1 ? 'pedido pendente' : 'pedidos pendentes'}
          </p>
        </div>
        
        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={handleViewExchanges}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            Ver Pedidos
          </Button>
          
          <Button 
            variant="outline" 
            onClick={onClose}
            className="w-full"
          >
            Mais tarde
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExchangeSplashScreen;