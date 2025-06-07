
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, Moon, Sun, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WeekdayCheckboxCalendarProps {
  selectedDates: Date[];
  onDateSelect: (dates: Date[]) => void;
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
  const monthStart = startOfMonth(nextMonth);
  const monthEnd = endOfMonth(nextMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Separate weekdays and weekends
  const weekdays = daysInMonth.filter(date => {
    const dayOfWeek = date.getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
  });
  
  const weekends = daysInMonth.filter(date => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // Saturday and Sunday
  });

  const handleDateToggle = (date: Date) => {
    if (disabled) return;
    
    const isSelected = selectedDates.some(selectedDate => isSameDay(selectedDate, date));
    
    if (isSelected) {
      onDateSelect(selectedDates.filter(selectedDate => !isSameDay(selectedDate, date)));
    } else {
      onDateSelect([...selectedDates, date]);
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

  const getDayName = (date: Date) => {
    return format(date, 'EEEE', { locale: pt });
  };

  const formatDate = (date: Date) => {
    return format(date, 'd', { locale: pt });
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
        
        <CardContent className="space-y-6">
          {editCount >= 2 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Atingiu o limite de 2 submissões. Contacte o administrador para fazer alterações.
              </AlertDescription>
            </Alert>
          )}

          {/* Weekdays Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Dias da Semana (Segunda a Sexta)
            </h3>
            <div className="grid grid-cols-5 gap-4">
              {weekdays.map((date) => {
                const isSelected = selectedDates.some(selectedDate => isSameDay(selectedDate, date));
                return (
                  <div key={date.toISOString()} className="flex flex-col items-center">
                    <Label className="text-sm font-medium text-gray-700 mb-2">
                      {getDayName(date)}
                    </Label>
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-lg font-bold text-gray-900">
                        {formatDate(date)}
                      </span>
                      <Checkbox
                        id={`weekday-${date.toISOString()}`}
                        checked={isSelected}
                        onCheckedChange={() => handleDateToggle(date)}
                        disabled={disabled}
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekends Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              Fins de Semana (Sábado e Domingo)
            </h3>
            <div className="grid grid-cols-2 gap-6 max-w-md">
              {weekends.map((date) => {
                const isSelected = selectedDates.some(selectedDate => isSameDay(selectedDate, date));
                return (
                  <div key={date.toISOString()} className="flex flex-col items-center">
                    <Label className="text-sm font-medium text-gray-700 mb-2">
                      {getDayName(date)}
                    </Label>
                    <div className="flex flex-col items-center space-y-2">
                      <span className="text-lg font-bold text-gray-900">
                        {formatDate(date)}
                      </span>
                      <Checkbox
                        id={`weekend-${date.toISOString()}`}
                        checked={isSelected}
                        onCheckedChange={() => handleDateToggle(date)}
                        disabled={disabled}
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
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
                <div key={overnight} className="flex flex-col items-center space-y-2">
                  <Label className="text-sm font-medium text-gray-700 text-center">
                    {overnight}
                  </Label>
                  <Checkbox
                    id={`overnight-${overnight}`}
                    checked={isSelected}
                    onCheckedChange={() => handleOvernightToggle(overnight)}
                    disabled={disabled}
                    className="h-5 w-5"
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
