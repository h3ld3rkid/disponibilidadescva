
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Save, Calendar, Moon, MessageSquare } from 'lucide-react';

interface ScheduleSummaryProps {
  selectedDates: string[];
  selectedOvernights: string[];
  editCount: number;
  canSubmitSchedule: boolean;
  submissionBlocked: boolean;
  isLoading: boolean;
  onSubmit: () => void;
}

const ScheduleSummary: React.FC<ScheduleSummaryProps> = ({
  selectedDates,
  selectedOvernights,
  editCount,
  canSubmitSchedule,
  submissionBlocked,
  isLoading,
  onSubmit
}) => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Resumo da Escala</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-600 font-medium">Turnos</p>
              </div>
              <p className="text-2xl font-bold text-blue-900">{selectedDates.length}</p>
            </div>
            
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Moon className="h-4 w-4 text-purple-600" />
                <p className="text-sm text-purple-600 font-medium">Pernoites</p>
              </div>
              <p className="text-2xl font-bold text-purple-900">{selectedOvernights.length}</p>
            </div>
          </div>

          {/* Selected items */}
          {selectedDates.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Turnos selecionados:</h4>
              <div className="space-y-1">
                {selectedDates.map(date => (
                  <span 
                    key={date}
                    className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1 mb-1"
                  >
                    {date.replace('_', ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {selectedOvernights.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-700 mb-2">Pernoites selecionados:</h4>
              <div className="space-y-1">
                {selectedOvernights.map(overnight => (
                  <span 
                    key={overnight}
                    className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded mr-1 mb-1"
                  >
                    {overnight}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Edit counter */}
          <div className="text-center text-sm text-gray-600">
            Edições: {editCount}/2
          </div>

          {/* Submit button */}
          <Button 
            onClick={onSubmit}
            disabled={!canSubmitSchedule || submissionBlocked || isLoading}
            className="w-full"
            variant={submissionBlocked ? "destructive" : "default"}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                A submeter...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {submissionBlocked ? 'Limite de edições atingido' : 'Guardar Escala'}
              </div>
            )}
          </Button>
          
          {!canSubmitSchedule && (
            <p className="text-sm text-gray-500 text-center">
              Selecione pelo menos uma opção
            </p>
          )}

          {submissionBlocked && (
            <p className="text-sm text-red-500 text-center">
              Já atingiu o limite de 2 edições por mês
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduleSummary;
