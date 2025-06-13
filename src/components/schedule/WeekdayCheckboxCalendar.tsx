
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Moon } from 'lucide-react';

interface WeekdayCheckboxCalendarProps {
  selectedDates: string[];
  selectedOvernights: string[];
  shiftNotes: string;
  overnightNotes: string;
  onDateToggle: (date: string) => void;
  onOvernightToggle: (overnight: string) => void;
  onShiftNotesChange: (notes: string) => void;
  onOvernightNotesChange: (notes: string) => void;
  isAdmin?: boolean;
  userEmail?: string;
}

const WeekdayCheckboxCalendar: React.FC<WeekdayCheckboxCalendarProps> = ({
  selectedDates,
  selectedOvernights,
  shiftNotes,
  overnightNotes,
  onDateToggle,
  onOvernightToggle,
  onShiftNotesChange,
  onOvernightNotesChange,
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

  const FuturisticToggle = ({ id, checked, onToggle, label, color = "blue" }: {
    id: string;
    checked: boolean;
    onToggle: () => void;
    label: string;
    color?: string;
  }) => {
    const getColorClasses = () => {
      if (checked) {
        switch (color) {
          case "blue":
            return "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30";
          case "orange":
            return "bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-500/30";
          case "purple":
            return "bg-purple-600 border-purple-600 text-white shadow-lg shadow-purple-500/30";
          default:
            return "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30";
        }
      } else {
        switch (color) {
          case "blue":
            return "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50";
          case "orange":
            return "bg-white border-gray-300 text-gray-700 hover:border-orange-400 hover:bg-orange-50";
          case "purple":
            return "bg-white border-gray-300 text-gray-700 hover:border-purple-400 hover:bg-purple-50";
          default:
            return "bg-white border-gray-300 text-gray-700 hover:border-blue-400 hover:bg-blue-50";
        }
      }
    };

    return (
      <div className="relative">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onToggle}
          className="sr-only"
        />
        <Label
          htmlFor={id}
          className={`
            flex items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-300 ease-in-out
            border-2 font-semibold text-sm min-h-[60px]
            ${getColorClasses()}
            transform hover:scale-105 active:scale-95
          `}
        >
          <span className="text-center font-medium">
            {label.replace('_', ' ')}
          </span>
          {checked && (
            <div className="absolute top-2 right-2">
              <div className="w-3 h-3 bg-white rounded-full opacity-90 animate-pulse"></div>
            </div>
          )}
        </Label>
      </div>
    );
  };

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
        <CardContent className="space-y-8">
          {/* Weekday Shifts */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-6">Dias da Semana</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekdayShifts.map(shift => (
                <FuturisticToggle
                  key={shift}
                  id={shift}
                  checked={selectedDates.includes(shift)}
                  onToggle={() => onDateToggle(shift)}
                  label={shift}
                  color="blue"
                />
              ))}
            </div>
          </div>

          {/* Weekend Shifts */}
          <div>
            <h3 className="text-lg font-medium text-gray-700 mb-6">Fim de Semana</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Saturday */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-6 rounded-xl border border-orange-200">
                <h4 className="text-lg font-semibold text-orange-800 mb-4 text-center">Sábado</h4>
                <div className="space-y-3">
                  {saturdayShifts.map(shift => (
                    <FuturisticToggle
                      key={shift}
                      id={shift}
                      checked={selectedDates.includes(shift)}
                      onToggle={() => onDateToggle(shift)}
                      label={shift.replace('Sábado_', '')}
                      color="orange"
                    />
                  ))}
                </div>
              </div>

              {/* Sunday */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
                <h4 className="text-lg font-semibold text-purple-800 mb-4 text-center">Domingo</h4>
                <div className="space-y-3">
                  {sundayShifts.map(shift => (
                    <FuturisticToggle
                      key={shift}
                      id={shift}
                      checked={selectedDates.includes(shift)}
                      onToggle={() => onDateToggle(shift)}
                      label={shift.replace('Domingo_', '')}
                      color="purple"
                    />
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
            value={shiftNotes}
            onChange={(e) => onShiftNotesChange(e.target.value)}
            className="min-h-[120px] resize-none border-2 focus:border-blue-500 transition-colors"
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
              <FuturisticToggle
                key={overnight}
                id={overnight}
                checked={selectedOvernights.includes(overnight)}
                onToggle={() => onOvernightToggle(overnight)}
                label={overnight}
                color="purple"
              />
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
            value={overnightNotes}
            onChange={(e) => onOvernightNotesChange(e.target.value)}
            className="min-h-[120px] resize-none border-2 focus:border-purple-500 transition-colors"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default WeekdayCheckboxCalendar;
