
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, Moon, Sun, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WeekdayCheckboxCalendarProps {
  selectedDates: string[];
  onDateSelect: (dates: string[]) => void;
  selectedOvernights: string[];
  onOvernightSelect: (overnights: string[]) => void;
  nextMonth: Date;
  disabled?: boolean;
  editCount?: number;
  notes?: string;
  onNotesChange?: (notes: string) => void;
  overnightNotes?: string;
  onOvernightNotesChange?: (notes: string) => void;
}

const WeekdayCheckboxCalendar: React.FC<WeekdayCheckboxCalendarProps> = ({
  selectedDates,
  onDateSelect,
  selectedOvernights,
  onOvernightSelect,
  nextMonth,
  disabled = false,
  editCount = 0,
  notes = '',
  onNotesChange,
  overnightNotes = '',
  onOvernightNotesChange
}) => {
  // Define weekdays (without shifts) and weekend days (with shifts)
  const weekdays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
  
  const weekendDays = [
    { day: 'Sábado', shifts: ['manhã', 'tarde', 'noite'] },
    { day: 'Domingo', shifts: ['manhã', 'noite'] }
  ];

  const handleWeekdayToggle = (weekday: string) => {
    if (disabled) return;
    
    const isSelected = selectedDates.includes(weekday);
    
    if (isSelected) {
      onDateSelect(selectedDates.filter(selected => selected !== weekday));
    } else {
      onDateSelect([...selectedDates, weekday]);
    }
  };

  const handleShiftToggle = (shiftId: string) => {
    if (disabled) return;
    
    const isSelected = selectedDates.includes(shiftId);
    
    if (isSelected) {
      onDateSelect(selectedDates.filter(selected => selected !== shiftId));
    } else {
      onDateSelect([...selectedDates, shiftId]);
    }
  };

  const handleOvernightToggle = (overnight: string) => {
    if (disabled) return;
    
    const isSelected = selectedOvernights.includes(overnight);
    
    if (isSelected) {
      onOvernightSelect(selectedOvernights.filter(selected => selected !== overnight));
    } else {
      onOvernightSelect([...selectedOvernights, overnight]);
    }
  };

  // Generate overnight options
  const overnightOptions = [
    'Dom/Seg', 'Seg/Ter', 'Ter/Qua', 'Qua/Qui', 'Qui/Sex', 'Sex/Sab', 'Sab/Dom'
  ];

  return (
    <div className="space-y-8">
      {/* Shifts Section */}
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sun className="h-6 w-6 text-yellow-600" />
            Turnos - {format(nextMonth, 'MMMM yyyy', { locale: pt })}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {editCount >= 2 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Atingiu o limite de 2 submissões. Contacte o administrador para fazer alterações.
              </AlertDescription>
            </Alert>
          )}

          {/* Weekdays Section (Monday to Friday - no shifts) */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Dias da Semana
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {weekdays.map((weekday) => {
                const isSelected = selectedDates.includes(weekday);
                return (
                  <div key={weekday} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <Checkbox
                      id={weekday}
                      checked={isSelected}
                      onCheckedChange={() => handleWeekdayToggle(weekday)}
                      disabled={disabled}
                      className="h-6 w-6"
                    />
                    <Label 
                      htmlFor={weekday} 
                      className="text-base font-medium text-gray-700 cursor-pointer flex-1"
                    >
                      {weekday}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="border-t-2 border-gray-300 my-6"></div>

          {/* Weekend Days Section (Saturday and Sunday - with shifts) */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Fim de Semana
            </h3>
            {weekendDays.map((weekendDay) => (
              <div key={weekendDay.day} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <h4 className="text-base font-semibold text-gray-900 mb-3">
                  {weekendDay.day}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {weekendDay.shifts.map((shift) => {
                    const shiftId = `${weekendDay.day}_${shift}`;
                    const isSelected = selectedDates.includes(shiftId);
                    return (
                      <div key={shiftId} className="flex items-center space-x-3 p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50">
                        <Checkbox
                          id={shiftId}
                          checked={isSelected}
                          onCheckedChange={() => handleShiftToggle(shiftId)}
                          disabled={disabled}
                          className="h-6 w-6"
                        />
                        <Label 
                          htmlFor={shiftId} 
                          className="text-sm font-medium text-gray-700 capitalize cursor-pointer flex-1"
                        >
                          {shift}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Notes for Shifts */}
          <div className="space-y-3">
            <Label htmlFor="shift-notes" className="text-sm font-medium text-gray-700">
              Observações sobre turnos (opcional)
            </Label>
            <Textarea
              id="shift-notes"
              placeholder="Ex: Não posso fazer turnos noturnos no primeiro fim de semana..."
              value={notes}
              onChange={(e) => onNotesChange?.(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Overnights Section */}
      <Card className="bg-white border-gray-200 shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Moon className="h-6 w-6 text-purple-600" />
            Pernoitas - {format(nextMonth, 'MMMM yyyy', { locale: pt })}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {overnightOptions.map((overnight) => {
              const isSelected = selectedOvernights.includes(overnight);
              return (
                <div key={overnight} className="flex flex-col items-center space-y-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <Label className="text-sm font-medium text-gray-700 text-center">
                    {overnight}
                  </Label>
                  <Checkbox
                    id={`overnight-${overnight}`}
                    checked={isSelected}
                    onCheckedChange={() => handleOvernightToggle(overnight)}
                    disabled={disabled}
                    className="h-6 w-6"
                  />
                </div>
              );
            })}
          </div>

          {/* Notes for Overnights */}
          <div className="space-y-3">
            <Label htmlFor="overnight-notes" className="text-sm font-medium text-gray-700">
              Observações sobre pernoitas (opcional)
            </Label>
            <Textarea
              id="overnight-notes"
              placeholder="Ex: Prefiro pernoitas de fim de semana..."
              value={overnightNotes}
              onChange={(e) => onOvernightNotesChange?.(e.target.value)}
              className="min-h-[80px] resize-none"
              disabled={disabled}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeekdayCheckboxCalendar;
