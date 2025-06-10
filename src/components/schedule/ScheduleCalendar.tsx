
import React, { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import SimpleScheduleForm from './SimpleScheduleForm';

interface ScheduleCalendarProps {
  userEmail?: string;
  isAdmin?: boolean;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ userEmail, isAdmin = false }) => {
  const [userInfo, setUserInfo] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    console.log('=== SCHEDULE CALENDAR INITIALIZATION ===');
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      const parsedUserInfo = JSON.parse(storedUser);
      console.log('User info loaded:', parsedUserInfo);
      setUserInfo(parsedUserInfo);
    }
  }, [userEmail]);

  return (
    <div className="min-h-screen bg-gray-50">
      <SimpleScheduleForm 
        userEmail={userEmail}
        userInfo={userInfo}
      />
    </div>
  );
};

export default ScheduleCalendar;
