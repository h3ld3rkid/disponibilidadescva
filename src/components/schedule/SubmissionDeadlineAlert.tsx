
import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle } from 'lucide-react';
import { systemSettingsService } from "@/services/supabase/systemSettingsService";

interface SubmissionDeadlineAlertProps {
  userEmail?: string;
}

const SubmissionDeadlineAlert: React.FC<SubmissionDeadlineAlertProps> = ({ userEmail }) => {
  const [hasSpecialPermission, setHasSpecialPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkPermissions = async () => {
      if (!userEmail) {
        setIsLoading(false);
        return;
      }

      try {
        const permission = await systemSettingsService.getSystemSetting(`allow_submission_after_15th_${userEmail}`);
        setHasSpecialPermission(permission === 'true');
      } catch (error) {
        console.error('Error checking permissions:', error);
        setHasSpecialPermission(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPermissions();
  }, [userEmail]);

  if (isLoading) {
    return null;
  }

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  // Calculate days until 15th of current month
  const fifteenthThisMonth = new Date(currentYear, currentMonth, 15);
  const daysUntil15th = Math.ceil((fifteenthThisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  if (currentDay <= 15) {
    // Before or on 15th - show countdown
    if (daysUntil15th === 0) {
      return (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Último dia!</strong> Hoje é o último dia para submeter a sua escala.
          </AlertDescription>
        </Alert>
      );
    } else if (daysUntil15th > 0) {
      return (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Só dispõe de <strong>{daysUntil15th} dia{daysUntil15th !== 1 ? 's' : ''}</strong> para submeter a escala.
          </AlertDescription>
        </Alert>
      );
    }
  } else {
    // After 15th - show warning unless user has special permission
    if (hasSpecialPermission) {
      return (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <Clock className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Permissão especial:</strong> Pode submeter a escala após o dia 15.
          </AlertDescription>
        </Alert>
      );
    } else {
      return (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>ATENÇÃO:</strong> Hoje é dia {currentDay} e já não pode submeter a escala.
          </AlertDescription>
        </Alert>
      );
    }
  }
  
  return null;
};

export default SubmissionDeadlineAlert;
