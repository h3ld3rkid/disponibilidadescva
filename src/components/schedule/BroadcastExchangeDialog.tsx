import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Info } from 'lucide-react';
import { getDayType } from '@/utils/dateUtils';

interface BroadcastExchangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (offeredDate: string, offeredShift: string, message: string) => void;
  isSubmitting: boolean;
}

const BroadcastExchangeDialog: React.FC<BroadcastExchangeDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting
}) => {
  const [offeredDate, setOfferedDate] = useState('');
  const [offeredShift, setOfferedShift] = useState('');
  const [message, setMessage] = useState('');

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

  const handleSubmit = () => {
    if (!offeredDate || !offeredShift) {
      return;
    }
    onSubmit(offeredDate, offeredShift, message);
    // Reset form
    setOfferedDate('');
    setOfferedShift('');
    setMessage('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Enviar Proposta para Todos</DialogTitle>
          <DialogDescription>
            Esta proposta será enviada para todos os utilizadores ativos. Eles poderão aceitar oferecendo um dos seus turnos em troca.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <Label className="text-sm font-medium">O que oferece:</Label>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="broadcastOfferedDate">Data</Label>
                <Input
                  id="broadcastOfferedDate"
                  type="date"
                  value={offeredDate}
                  onChange={(e) => {
                    setOfferedDate(e.target.value);
                    setOfferedShift('');
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
                <Label htmlFor="broadcastOfferedShift">Tipo de Turno</Label>
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
            <Label htmlFor="broadcastMessage">Mensagem (opcional)</Label>
            <Textarea
              id="broadcastMessage"
              placeholder="Adicione uma mensagem para explicar a troca..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
            <p className="text-sm text-amber-800">
              <strong>Nota:</strong> Todos os utilizadores ativos receberão esta proposta e poderão oferecer um dos seus turnos em troca.
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !offeredDate || !offeredShift}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmitting ? 'A enviar...' : 'Enviar para Todos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BroadcastExchangeDialog;
