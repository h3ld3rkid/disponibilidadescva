
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Moon } from 'lucide-react';

interface WeekdayCheckboxCalendarProps {
  selectedDates: string[];
  selectedOvernights: string[];
  notes: string;
  onDateToggle: (date: string) => void;
  onOvernightToggle: (overnight: string) => void;
  onNotesChange: (notes: string) => void;
  isAdmin?: boolean;
  userEmail?: string;
}

const WeekdayCheckboxCalendar: React.FC<WeekdayCheckboxCalendarProps> = ({
  selectedDates,
  selectedOvernights,
  notes,
  onDateToggle,
  onOvernightToggle,
  onNotesChange,
  isAdmin = false,
  userEmail
}) => {
  const shifts = [
    'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira',
    'Sábado_manhã', 'Sábado_tarde', 'Sábado_noite',
    'Domingo_manhã', 'Domingo_noite'
  ];

  const overnights = [
    'Dom/Seg', 'Seg/Ter', 'Ter/Qua', 'Qua/Qui', 'Qui/Sex', 'Sex/Sab', 'Sab/Dom'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Calendar className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            {isAdmin && userEmail ? `Escala de ${userEmail}` : 'Inserir Escala'}
          </h1>
        </div>
        <p className="text-gray-600">
          Selecione os seus turnos e pernoites para o próximo mês
        </p>
      </div>

      {/* Shifts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Turnos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {shifts.map(shift => (
              <div key={shift} className="flex items-center space-x-2">
                <Checkbox
                  id={shift}
                  checked={selectedDates.includes(shift)}
                  onCheckedChange={() => onDateToggle(shift)}
                />
                <Label htmlFor={shift} className="text-sm cursor-pointer">
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
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-purple-600" />
            Pernoites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {overnights.map(overnight => (
              <div key={overnight} className="flex items-center space-x-2">
                <Checkbox
                  id={overnight}
                  checked={selectedOvernights.includes(overnight)}
                  onCheckedChange={() => onOvernightToggle(overnight)}
                />
                <Label htmlFor={overnight} className="text-sm cursor-pointer">
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
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-[100px]"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default WeekdayCheckboxCalendar;
