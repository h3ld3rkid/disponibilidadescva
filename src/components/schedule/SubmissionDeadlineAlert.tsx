import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, AlertTriangle, CalendarRange } from 'lucide-react';
import { systemSettingsService } from "@/services/supabase/systemSettingsService";

interface SubmissionDeadlineAlertProps {
  userEmail?: string;
  onlyPeriodBanner?: boolean;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const formatPt = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

const SubmissionDeadlineAlert: React.FC<SubmissionDeadlineAlertProps> = ({ userEmail, onlyPeriodBanner }) => {
  const [hasSpecialPermission, setHasSpecialPermission] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<{ start: string; end: string } | null>(null);

  // Mês alvo = mês seguinte (igual à lógica de getTargetMonth no ScheduleCalendar)
  const now = new Date();
  const targetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const targetYear = targetDate.getFullYear();
  const targetMonthIndex = targetDate.getMonth();
  const targetMonthLabel = MONTH_NAMES[targetMonthIndex];
  const periodKey = `submission_period_${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}`;

  useEffect(() => {
    const load = async () => {
      try {
        // Permissão especial do utilizador
        if (userEmail) {
          const permission = await systemSettingsService.getSystemSetting(
            `allow_submission_after_15th_${userEmail}`
          );
          setHasSpecialPermission(permission === 'true');
        }

        // Período de submissão do mês alvo
        const raw = await systemSettingsService.getSystemSetting(periodKey);
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (parsed.start || parsed.end) {
              setPeriod({ start: parsed.start || '', end: parsed.end || '' });
            }
          } catch {
            setPeriod(null);
          }
        }
      } catch (error) {
        console.error('Error loading submission alert data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userEmail, periodKey]);

  if (isLoading) return null;

  // Banner principal: período de submissão definido pelo admin
  const periodBanner = period && (period.start || period.end) ? (
    <Alert className="mb-3 border-indigo-200 bg-indigo-50">
      <CalendarRange className="h-4 w-4 text-indigo-600" />
      <AlertDescription className="text-indigo-900">
        <strong>Submissão da escala de {targetMonthLabel}:</strong>{' '}
        {period.start && period.end ? (
          <>aberta de <strong>{formatPt(period.start)}</strong> a <strong>{formatPt(period.end)}</strong>.</>
        ) : period.start ? (
          <>abre a <strong>{formatPt(period.start)}</strong>.</>
        ) : (
          <>termina a <strong>{formatPt(period.end)}</strong>.</>
        )}
      </AlertDescription>
    </Alert>
  ) : null;

  // Lógica original do dia 15
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const fifteenthThisMonth = new Date(currentYear, currentMonth, 15);
  const daysUntil15th = Math.ceil(
    (fifteenthThisMonth.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  let deadlineBanner: React.ReactNode = null;
  if (currentDay <= 15) {
    if (daysUntil15th === 0) {
      deadlineBanner = (
        <Alert className="mb-6 border-orange-200 bg-orange-50">
          <Clock className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Último dia!</strong> Hoje é o último dia para submeter a sua escala.
          </AlertDescription>
        </Alert>
      );
    } else if (daysUntil15th > 0) {
      deadlineBanner = (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Só dispõe de <strong>{daysUntil15th} dia{daysUntil15th !== 1 ? 's' : ''}</strong> para submeter a escala.
          </AlertDescription>
        </Alert>
      );
    }
  } else {
    if (hasSpecialPermission) {
      deadlineBanner = (
        <Alert className="mb-6 border-green-200 bg-green-50">
          <Clock className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Permissão especial:</strong> Pode submeter a escala após o dia 15.
          </AlertDescription>
        </Alert>
      );
    } else {
      deadlineBanner = (
        <Alert className="mb-6 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>ATENÇÃO:</strong> Hoje é dia {currentDay} e já não pode submeter a escala.
          </AlertDescription>
        </Alert>
      );
    }
  }

  if (!periodBanner && !deadlineBanner) return null;

  return (
    <>
      {periodBanner}
      {deadlineBanner}
    </>
  );
};

export default SubmissionDeadlineAlert;
