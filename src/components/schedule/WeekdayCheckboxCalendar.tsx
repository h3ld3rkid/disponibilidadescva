
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
  const weekdayShifts = [
    'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'
  ];

  const saturdayShifts = [
    'Sábado_manhã', 'Sábado_tarde', 'Sábado_noite'
  ];

  const sundayShifts = [
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
        <CardContent className="space-y-6">
          {/* Weekday Shifts */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-4">Dias da Semana</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekdayShifts.map(shift => (
                <div key={shift} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <Checkbox
                    id={shift}
                    checked={selectedDates.includes(shift)}
                    onCheckedChange={() => onDateToggle(shift)}
                    className="h-5 w-5"
                  />
                  <Label htmlFor={shift} className="text-base cursor-pointer font-medium">
                    {shift}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Weekend Shifts */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-4">Fim de Semana</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Saturday */}
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="text-base font-medium text-orange-800 mb-3">Sábado</h4>
                <div className="space-y-3">
                  {saturdayShifts.map(shift => (
                    <div key={shift} className="flex items-center space-x-3 p-2 bg-white rounded hover:bg-orange-100 transition-colors">
                      <Checkbox
                        id={shift}
                        checked={selectedDates.includes(shift)}
                        onCheckedChange={() => onDateToggle(shift)}
                        className="h-5 w-5"
                      />
                      <Label htmlFor={shift} className="text-base cursor-pointer">
                        {shift.replace('Sábado_', '')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sunday */}
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="text-base font-medium text-purple-800 mb-3">Domingo</h4>
                <div className="space-y-3">
                  {sundayShifts.map(shift => (
                    <div key={shift} className="flex items-center space-x-3 p-2 bg-white rounded hover:bg-purple-100 transition-colors">
                      <Checkbox
                        id={shift}
                        checked={selectedDates.includes(shift)}
                        onCheckedChange={() => onDateToggle(shift)}
                        className="h-5 w-5"
                      />
                      <Label htmlFor={shift} className="text-base cursor-pointer">
                        {shift.replace('Domingo_', '')}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shifts Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Observações - Turnos</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Adicione observações sobre a sua disponibilidade para turnos..."
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="min-h-[100px]"
          />
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {overnights.map(overnight => (
              <div key={overnight} className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                <Checkbox
                  id={overnight}
                  checked={selectedOvernights.includes(overnight)}
                  onCheckedChange={() => onOvernightToggle(overnight)}
                  className="h-5 w-5"
                />
                <Label htmlFor={overnight} className="text-base cursor-pointer font-medium">
                  {overnight}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Overnights Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Observações - Pernoites</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Adicione observações sobre a sua disponibilidade para pernoites..."
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
