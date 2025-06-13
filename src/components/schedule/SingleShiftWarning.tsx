
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SingleShiftWarningProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
}

const SingleShiftWarning: React.FC<SingleShiftWarningProps> = ({
  isOpen,
  onClose,
  onContinue
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="mx-4 w-full max-w-md animate-in fade-in-0 zoom-in-95">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                Atenção!
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-600 leading-relaxed">
              Apenas um turno foi escolhido. Para facilitar a criação da escala, 
              recomendamos que escolha mais que um turno.
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Voltar e Editar
            </Button>
            <Button
              onClick={onContinue}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              Continuar Assim
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SingleShiftWarning;
