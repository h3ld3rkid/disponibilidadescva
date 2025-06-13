
import React from 'react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ScheduleCalendar from './ScheduleCalendar';

interface UserScheduleViewerProps {
  userEmail: string | null;
  userName: string | null;
  getUserNameFromEmail: (email: string) => string;
  isAdmin: boolean;
  onBack: () => void;
}

const UserScheduleViewer: React.FC<UserScheduleViewerProps> = ({
  userEmail,
  userName,
  getUserNameFromEmail,
  isAdmin,
  onBack
}) => {
  if (!userEmail) return null;
  
  const displayName = userName || getUserNameFromEmail(userEmail);
  
  // Calculate the target month (next month)
  const now = new Date();
  const targetMonth = new Date(now.getFullYear(), now.getMonth() + 1);
  const monthName = targetMonth.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' });
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Escala mês de {monthName}</CardTitle>
          <CardDescription>Visualize a escala detalhada de {displayName}</CardDescription>
        </div>
        <Button 
          variant="outline" 
          onClick={onBack}
        >
          Voltar à lista
        </Button>
      </CardHeader>
      
      <CardContent>
        <ScheduleCalendar 
          userEmail={userEmail} 
          isAdmin={isAdmin}
        />
      </CardContent>
    </Card>
  );
};

export default UserScheduleViewer;
