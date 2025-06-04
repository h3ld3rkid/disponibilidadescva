
import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, addMonths, getDaysInMonth, startOfMonth, getDay } from "date-fns";
import { pt } from "date-fns/locale";

interface WeekdayCheckboxCalendarProps {
  selectedDates: Date[];
  onDateSelect: (dates: Date[]) => void;
  nextMonth: Date;
  disabled?: boolean;
}

const WeekdayCheckboxCalendar: React.FC<WeekdayCheckboxCalendarProps> = ({
  selectedDates,
  onDateSelect,
  nextMonth,
  disabled = false
}) => {
  const monthStart = startOfMonth(nextMonth);
  const daysInMonth = getDaysInMonth(nextMonth);
  
  // Get all weekdays, saturdays and sundays in the month
  const weekdays = [];
  const saturdays = [];
  const sundays = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day);
    const dayOfWeek = getDay(date);
    
    if (dayOfWeek >= 1 && dayOfWeek <= 5) { // Monday to Friday
      weekdays.push(date);
    } else if (dayOfWeek === 6) { // Saturday
      saturdays.push(date);
    } else if (dayOfWeek === 0) { // Sunday
      sundays.push(date);
    }
  }
  
  const isDateSelected = (date: Date) => {
    return selectedDates.some(selectedDate => 
      selectedDate.getTime() === date.getTime()
    );
  };
  
  const handleDateToggle = (date: Date, checked: boolean) => {
    if (disabled) return;
    
    let newSelectedDates;
    if (checked) {
      newSelectedDates = [...selectedDates, date];
    } else {
      newSelectedDates = selectedDates.filter(selectedDate => 
        selectedDate.getTime() !== date.getTime()
      );
    }
    onDateSelect(newSelectedDates);
  };
  
  const handleSelectAll = (dates: Date[], checked: boolean) => {
    if (disabled) return;
    
    let newSelectedDates = [...selectedDates];
    
    if (checked) {
      // Add all dates that aren't already selected
      dates.forEach(date => {
        if (!isDateSelected(date)) {
          newSelectedDates.push(date);
        }
      });
    } else {
      // Remove all dates from this category
      newSelectedDates = newSelectedDates.filter(selectedDate => 
        !dates.some(date => date.getTime() === selectedDate.getTime())
      );
    }
    
    onDateSelect(newSelectedDates);
  };
  
  const areAllSelected = (dates: Date[]) => {
    return dates.length > 0 && dates.every(date => isDateSelected(date));
  };
  
  const areSomeSelected = (dates: Date[]) => {
    return dates.some(date => isDateSelected(date));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Escala para {format(nextMonth, 'MMMM yyyy', { locale: pt })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Weekdays */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all-weekdays"
              checked={areAllSelected(weekdays)}
              onCheckedChange={(checked) => handleSelectAll(weekdays, checked as boolean)}
              disabled={disabled}
            />
            <Label htmlFor="select-all-weekdays" className="font-semibold">
              Dias de Semana (Segunda a Sexta) - {weekdays.length} dias
            </Label>
          </div>
          <div className="grid grid-cols-5 gap-2 ml-6">
            {weekdays.map((date) => (
              <div key={date.getTime()} className="flex items-center space-x-2">
                <Checkbox
                  id={`weekday-${date.getTime()}`}
                  checked={isDateSelected(date)}
                  onCheckedChange={(checked) => handleDateToggle(date, checked as boolean)}
                  disabled={disabled}
                />
                <Label htmlFor={`weekday-${date.getTime()}`} className="text-sm">
                  {format(date, 'dd/MM')}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Saturdays */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all-saturdays"
              checked={areAllSelected(saturdays)}
              onCheckedChange={(checked) => handleSelectAll(saturdays, checked as boolean)}
              disabled={disabled}
            />
            <Label htmlFor="select-all-saturdays" className="font-semibold">
              Sábados - {saturdays.length} dias
            </Label>
          </div>
          <div className="grid grid-cols-3 gap-2 ml-6">
            {saturdays.map((date) => (
              <div key={date.getTime()} className="flex items-center space-x-2">
                <Checkbox
                  id={`saturday-${date.getTime()}`}
                  checked={isDateSelected(date)}
                  onCheckedChange={(checked) => handleDateToggle(date, checked as boolean)}
                  disabled={disabled}
                />
                <Label htmlFor={`saturday-${date.getTime()}`} className="text-sm">
                  {format(date, 'dd/MM')}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Sundays */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all-sundays"
              checked={areAllSelected(sundays)}
              onCheckedChange={(checked) => handleSelectAll(sundays, checked as boolean)}
              disabled={disabled}
            />
            <Label htmlFor="select-all-sundays" className="font-semibold">
              Domingos - {sundays.length} dias
            </Label>
          </div>
          <div className="grid grid-cols-2 gap-2 ml-6">
            {sundays.map((date) => (
              <div key={date.getTime()} className="flex items-center space-x-2">
                <Checkbox
                  id={`sunday-${date.getTime()}`}
                  checked={isDateSelected(date)}
                  onCheckedChange={(checked) => handleDateToggle(date, checked as boolean)}
                  disabled={disabled}
                />
                <Label htmlFor={`sunday-${date.getTime()}`} className="text-sm">
                  {format(date, 'dd/MM')}
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-gray-600">
            Total de dias selecionados: {selectedDates.length}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeekdayCheckboxCalendar;
