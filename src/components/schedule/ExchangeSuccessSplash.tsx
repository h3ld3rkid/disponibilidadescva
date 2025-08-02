import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X } from 'lucide-react';

interface ExchangeSuccessSplashProps {
  onClose: () => void;
}

const ExchangeSuccessSplash: React.FC<ExchangeSuccessSplashProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="max-w-md mx-4 bg-red-50 border-red-200">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center space-x-3">
              <div className="bg-red-100 p-2 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-900">
                  Pedido Enviado!
                </h3>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-3">
            <p className="text-red-800 font-medium">
              É obrigatório colocar a troca no quadro das escalas após ser aceite!
            </p>
            
            <p className="text-red-700 text-sm">
              O seu pedido de troca foi enviado com sucesso. Lembre-se de que, após a troca ser aceite, deve atualizá-la manualmente nas escalas.
            </p>
            
            <div className="pt-3">
              <Button 
                onClick={onClose}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
              >
                Compreendi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExchangeSuccessSplash;