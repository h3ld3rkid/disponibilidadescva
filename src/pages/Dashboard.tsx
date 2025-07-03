
import React, { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { useAuthSession } from '@/hooks/useAuthSession';
import Navbar from '@/components/Navbar';
import UserManagement from '@/components/user/UserManagement';
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar';
import UserSchedules from '@/components/schedule/UserSchedules';
import ProfileEdit from '@/components/profile/ProfileEdit';
import Home from '@/components/Home';
import CurrentSchedule from '@/components/schedule/CurrentSchedule';
import ScheduleUpload from '@/components/admin/ScheduleUpload';
import DatabaseConfigForm from '@/components/config/DatabaseConfig';
import Announcements from '@/components/announcements/Announcements';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import ShiftExchange from '@/components/schedule/ShiftExchange';

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session, isLoading, clearSession, refreshSession } = useAuthSession();
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    if (!isLoading && !session) {
      toast({
        title: "Sessão expirada",
        description: "Por favor, inicie sessão novamente",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [session, isLoading, navigate, toast]);

  useEffect(() => {
    const handleRoleChange = () => {
      console.log("Role change event detected");
      setForceUpdate(prev => prev + 1);
    };
    
    const handleAnnouncementsChange = () => {
      console.log("Announcements change event detected");
      setForceUpdate(prev => prev + 1);
    };
    
    const handleSchedulesChange = () => {
      console.log("Schedule change event detected");
      setForceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('userRoleChanged', handleRoleChange);
    window.addEventListener('announcementsChanged', handleAnnouncementsChange);
    window.addEventListener('schedulesChanged', handleSchedulesChange);
    
    return () => {
      window.removeEventListener('userRoleChanged', handleRoleChange);
      window.removeEventListener('announcementsChanged', handleAnnouncementsChange);
      window.removeEventListener('schedulesChanged', handleSchedulesChange);
    };
  }, []);

  // Activity detection for session refresh
  useEffect(() => {
    const handleActivity = () => {
      if (session) {
        refreshSession();
      }
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [session, refreshSession]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg text-gray-600">A carregar...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const isAdmin = session.role === 'admin';

  const checkAdminRoute = (element: React.ReactNode) => {
    return isAdmin ? element : <Navigate to="/dashboard" replace />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar key={`nav-${forceUpdate}`} email={session.email} role={session.role} />
      
      <div className="bg-white border-b border-gray-200 py-4">
        <div className="container mx-auto px-4 flex items-center">
          <img 
            src="https://amares.cruzvermelha.pt/images/site/Amares.webp" 
            alt="Cruz Vermelha Amares" 
            className="h-8 object-contain mr-3" 
          />
          <h1 className="text-2xl font-semibold text-gray-900">Escalas Cruz Vermelha Amares</h1>
        </div>
      </div>

      <AnnouncementBanner />

      <div className="flex-1">
        <div className="w-full max-w-[1440px] mx-auto px-4">
          <Routes>
            <Route path="/" element={<Home userEmail={session.email} isAdmin={isAdmin} />} />
            <Route path="/schedule" element={<ScheduleCalendar key={`schedule-calendar-${forceUpdate}`} userEmail={session.email} isAdmin={isAdmin} />} />
            <Route path="/current-schedule" element={<CurrentSchedule isAdmin={isAdmin} />} />
            <Route path="/profile" element={<ProfileEdit />} />
            <Route path="/exchanges" element={<ShiftExchange />} />
            
            <Route path="/users" element={checkAdminRoute(<UserManagement key={`user-management-${forceUpdate}`} />)} />
            <Route path="/user-schedules" element={checkAdminRoute(<UserSchedules key={`user-schedules-${forceUpdate}`} />)} />
            <Route path="/schedule-upload" element={checkAdminRoute(<ScheduleUpload />)} />
            <Route path="/announcements" element={checkAdminRoute(<Announcements key={`announcements-${forceUpdate}`} />)} />
            <Route path="/config/database" element={checkAdminRoute(<DatabaseConfigForm />)} />
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
