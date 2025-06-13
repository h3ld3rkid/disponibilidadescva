import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { scheduleService } from "@/services/supabase/scheduleService";
import { Save, Calendar } from 'lucide-react';

interface SimpleScheduleFormProps {
  userEmail?: string;
  userInfo?: any;
}

const SimpleScheduleForm: React.FC<SimpleScheduleFormProps> = ({ userEmail: propUserEmail, userInfo }) => {
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);
  const [selectedOvernights, setSelectedOvernights] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const shifts = [
    'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira',
    'Sábado_manhã', 'Sábado_tarde', 'Sábado_noite',
    'Domingo_manhã', 'Domingo_noite'
  ];

  const overnights = [
    'Dom/Seg', 'Seg/Ter', 'Ter/Qua', 'Qua/Qui', 'Qui/Sex', 'Sex/Sab', 'Sab/Dom'
  ];

  const handleShiftToggle = (shift: string) => {
    setSelectedShifts(prev => {
      if (prev.includes(shift)) {
        return prev.filter(s => s !== shift);
      } else {
        return [...prev, shift];
      }
    });
  };

  const handleOvernightToggle = (overnight: string) => {
    setSelectedOvernights(prev => {
      if (prev.includes(overnight)) {
        return prev.filter(o => o !== overnight);
      } else {
        return [...prev, overnight];
      }
    });
  };

  const handleSubmit = async () => {
    const currentUserEmail = propUserEmail || userInfo?.email;
    
    if (!currentUserEmail) {
      toast({
        title: "Erro",
        description: "Email do utilizador não encontrado.",
        variant: "destructive",
      });
      return;
    }

    if (selectedShifts.length === 0 && selectedOvernights.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um turno ou pernoite.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('=== SUBMITTING SCHEDULE ===');
      console.log('Selected Shifts:', selectedShifts);
      console.log('Selected Overnights:', selectedOvernights);
      console.log('Notes:', notes);
      
      const scheduleData = {
        shifts: selectedShifts,
        overnights: selectedOvernights,
        shiftNotes: notes,
        overnightNotes: notes
      };
      
      const result = await scheduleService.saveSchedule(
        currentUserEmail,
        userInfo?.name || currentUserEmail,
        scheduleData
      );
      
      if (result.success) {
        toast({
          title: "Sucesso",
          description: "Escala submetida com sucesso!",
        });
        
        // Clear form
        setSelectedShifts([]);
        setSelectedOvernights([]);
        setNotes('');
      } else {
        throw new Error('Failed to save schedule');
      }
      
    } catch (error) {
      console.error('Error submitting schedule:', error);
      toast({
        title: "Erro",
        description: "Erro ao submeter a escala. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Calendar className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            Inserir Escala
          </h1>
        </div>
        <p className="text-gray-600">
          Selecione os seus turnos e pernoites
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Shifts */}
          <Card>
            <CardHeader>
              <CardTitle>Turnos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {shifts.map(shift => (
                  <div key={shift} className="flex items-center space-x-2">
                    <Checkbox
                      id={shift}
                      checked={selectedShifts.includes(shift)}
                      onCheckedChange={() => handleShiftToggle(shift)}
                    />
                    <Label htmlFor={shift} className="text-sm">
                      {shift.replace('_', ' ')}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Overnights */}
          <Card>
            <CardHeader>
              <CardTitle>Pernoites</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {overnights.map(overnight => (
                  <div key={overnight} className="flex items-center space-x-2">
                    <Checkbox
                      id={overnight}
                      checked={selectedOvernights.includes(overnight)}
                      onCheckedChange={() => handleOvernightToggle(overnight)}
                    />
                    <Label htmlFor={overnight} className="text-sm">
                      {overnight}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Adicione observações sobre a sua disponibilidade..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Resumo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-sm text-blue-600 font-medium">Turnos</p>
                <p className="text-2xl font-bold text-blue-900">{selectedShifts.length}</p>
              </div>
              
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <p className="text-sm text-purple-600 font-medium">Pernoites</p>
                <p className="text-2xl font-bold text-purple-900">{selectedOvernights.length}</p>
              </div>
              
              <Button 
                onClick={handleSubmit}
                disabled={isLoading || (selectedShifts.length === 0 && selectedOvernights.length === 0)}
                className="w-full"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    A submeter...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    Guardar Escala
                  </div>
                )}
              </Button>
              
              {selectedShifts.length === 0 && selectedOvernights.length === 0 && (
                <p className="text-sm text-gray-500 text-center">
                  Selecione pelo menos uma opção
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SimpleScheduleForm;
