
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { scheduleService } from "@/services/supabase/scheduleService";
import WeekdayCheckboxCalendar from './WeekdayCheckboxCalendar';
import { addMonths, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar, FileText, Save, Clock } from 'lucide-react';

interface ScheduleCalendarProps {
  userEmail?: string;
  isAdmin?: boolean;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ userEmail: propUserEmail, isAdmin = false }) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [editCount, setEditCount] = useState(0);
  const nextMonth = addMonths(new Date(), 1);

  useEffect(() => {
    // Get user info from localStorage if not provided via props
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      const parsedUserInfo = JSON.parse(storedUser);
      setUserInfo(parsedUserInfo);
    }
  }, []);

  const handleDateSelect = (dates: Date[]) => {
    setSelectedDates(dates);
  };

  const handleSubmitSchedule = async () => {
    const currentUserInfo = userInfo;
    const currentUserEmail = propUserEmail || currentUserInfo?.email;

    if (!currentUserInfo && !propUserEmail) {
      toast({
        title: "Erro de autenticação",
        description: "Informações do utilizador não encontradas.",
        variant: "destructive",
      });
      return;
    }

    if (selectedDates.length === 0) {
      toast({
        title: "Nenhuma data selecionada",
        description: "Por favor, selecione pelo menos uma data antes de submeter.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const scheduleData = {
        month: format(nextMonth, 'yyyy-MM'),
        dates: selectedDates
      };

      const result = await scheduleService.saveUserScheduleWithNotes(
        currentUserEmail,
        scheduleData,
        notes,
        { name: currentUserInfo?.name || 'User' }
      );

      if (result.success) {
        setEditCount(prev => prev + 1);
        toast({
          title: "Escala submetida",
          description: "A sua escala foi submetida com sucesso!",
        });
      } else {
        throw new Error("Failed to save schedule");
      }
    } catch (error) {
      console.error("Error submitting schedule:", error);
      toast({
        title: "Erro ao submeter",
        description: "Ocorreu um erro ao submeter a sua escala. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { toast } = useToast();

  const canSubmitSchedule = editCount < 2;
  const totalSelectedShifts = selectedDates.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calendar className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">
              Inserir Escala
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Selecione os seus turnos para {format(nextMonth, 'MMMM yyyy', { locale: pt })}
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Calendar Section - Takes most space */}
          <div className="xl:col-span-2">
            <WeekdayCheckboxCalendar
              selectedDates={selectedDates}
              onDateSelect={handleDateSelect}
              nextMonth={nextMonth}
              disabled={isLoading}
              editCount={editCount}
            />
          </div>

          {/* Sidebar with Notes and Actions */}
          <div className="xl:col-span-1 space-y-6">
            {/* Summary Card */}
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Resumo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-blue-600 font-medium">Turnos Selecionados</p>
                    <p className="text-2xl font-bold text-blue-900">{totalSelectedShifts}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg text-center">
                    <p className="text-sm text-gray-600 font-medium">Submissões</p>
                    <p className="text-2xl font-bold text-gray-900">{editCount} / 2</p>
                  </div>
                </div>
                
                {!canSubmitSchedule && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
                    <p className="text-red-700 text-sm font-medium text-center">
                      ⚠️ Limite de submissões atingido
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes Section */}
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                  Observações
                </CardTitle>
                <CardDescription>
                  Adicione observações sobre a sua disponibilidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                    Notas adicionais (opcional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Ex: Não posso fazer turnos noturnos no primeiro fim de semana..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="min-h-[120px] resize-none"
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit Section */}
            <Card className="bg-white border-gray-200 shadow-lg">
              <CardContent className="pt-6">
                <Button
                  onClick={handleSubmitSchedule}
                  disabled={isLoading || selectedDates.length === 0 || !canSubmitSchedule}
                  className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      A submeter...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Save className="h-5 w-5" />
                      Submeter Escala
                    </div>
                  )}
                </Button>
                
                {selectedDates.length === 0 && (
                  <p className="text-sm text-gray-500 text-center mt-2">
                    Selecione pelo menos um turno para submeter
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleCalendar;
