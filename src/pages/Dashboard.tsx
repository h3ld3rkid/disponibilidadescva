import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import UserManagement from '@/components/user/UserManagement';
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar';
import UserSchedules from '@/components/schedule/UserSchedules';
import ProfileEdit from '@/components/profile/ProfileEdit';
import Home from '@/components/Home';
import CurrentSchedule from '@/components/schedule/CurrentSchedule';
import ScheduleUpload from '@/components/admin/ScheduleUpload';
import DatabaseConfigForm from '@/components/config/DatabaseConfig';
import DatabaseConfigInternal from '@/components/config/DatabaseConfigInternal';
import Announcements from '@/components/announcements/Announcements';
import AnnouncementBanner from '@/components/announcements/AnnouncementBanner';
import ShiftExchange from '@/components/schedule/ShiftExchange';
import ExchangeSplashScreen from '@/components/schedule/ExchangeSplashScreen';
import MyServices from '@/components/schedule/MyServices';
import UpdatedSchedule from '@/components/schedule/UpdatedSchedule';
import Footer from '@/components/ui/footer';
import SessionTimer from '@/components/auth/SessionTimer';
import PDFAdditionalConfig from '@/pages/PDFAdditionalConfig';
import XLSXConfig from '@/pages/XLSXConfig';
import { sessionManager } from '@/services/sessionManager';
import { roleService } from '@/services/supabase/roleService';

interface UserInfo {
  email: string;
  role: string;
  isConnected: boolean;
}

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [verifiedAdmin, setVerifiedAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [showExchangeSplash, setShowExchangeSplash] = useState(false);

  // Verifica o role na BD - função segura
  const verifyUserRole = useCallback(async (email: string) => {
    try {
      const { isAdmin } = await roleService.getUserRole(email);
      setVerifiedAdmin(isAdmin);
    } catch (error) {
      console.error('Error verifying user role:', error);
      setVerifiedAdmin(false);
    }
  }, []);

  const updateUserInfo = useCallback(async () => {
    const session = sessionManager.getCurrentSession();
    if (session) {
      setUserInfo({
        email: session.email,
        role: session.role, // Usado apenas para UI inicial, não para segurança
        isConnected: session.isConnected
      });
      
      // Verificar role na BD para decisões de segurança
      await verifyUserRole(session.email);
      
      // Check if splash should be shown (once per session)
      const splashKey = `exchange-splash-${session.email}`;
      const hasShownSplash = sessionStorage.getItem(splashKey);
      
      if (!hasShownSplash) {
        setShowExchangeSplash(true);
        sessionStorage.setItem(splashKey, 'true');
      }
    } else {
      toast({
        title: "Sessão expirada",
        description: "Por favor, inicie sessão novamente",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [navigate, toast, verifyUserRole]);

  useEffect(() => {
    const handlePathChange = () => {
      setCurrentPath(window.location.pathname);
    };
    
    window.addEventListener('popstate', handlePathChange);
    
    return () => {
      window.removeEventListener('popstate', handlePathChange);
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      await updateUserInfo();
      setLoading(false);
    };
    init();
    
    const handleRoleChange = async () => {
      await updateUserInfo();
      setForceUpdate(prev => prev + 1);
    };
    
    const handleAnnouncementsChange = () => {
      setForceUpdate(prev => prev + 1);
    };
    
    const handleSchedulesChange = () => {
      setForceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('userRoleChanged', handleRoleChange);
    window.addEventListener('announcementsChanged', handleAnnouncementsChange);
    window.addEventListener('schedulesChanged', handleSchedulesChange);
    
    // Verificar role periodicamente na BD (a cada 30 segundos para não sobrecarregar)
    const roleCheckTimer = setInterval(async () => {
      const email = roleService.getCurrentUserEmail();
      if (email) {
        await verifyUserRole(email);
      }
    }, 30000);
    
    return () => {
      window.removeEventListener('userRoleChanged', handleRoleChange);
      window.removeEventListener('announcementsChanged', handleAnnouncementsChange);
      window.removeEventListener('schedulesChanged', handleSchedulesChange);
      clearInterval(roleCheckTimer);
    };
  }, [updateUserInfo, verifyUserRole]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg text-gray-600">A carregar...</div>
      </div>
    );
  }

  if (!userInfo) {
    return null;
  }

  // IMPORTANTE: verifiedAdmin é verificado na BD, isAdmin é do localStorage (apenas para UI)
  // Para proteção de rotas, usamos verifiedAdmin
  const checkAdminRoute = (element: React.ReactNode) => {
    return verifiedAdmin ? element : <Navigate to="/dashboard" replace />;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar key={`nav-${forceUpdate}`} email={userInfo.email} role={verifiedAdmin ? 'admin' : 'user'} />
      
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
      <SessionTimer />

      {showExchangeSplash && userInfo && (
        <ExchangeSplashScreen 
          userEmail={userInfo.email} 
          onClose={() => setShowExchangeSplash(false)}
        />
      )}

      <div className="flex-1">
        <div className="w-full max-w-[1440px] mx-auto px-4">
          <Routes>
            <Route path="/" element={<Home userEmail={userInfo.email} isAdmin={verifiedAdmin} />} />
            <Route path="/schedule" element={<ScheduleCalendar key={`schedule-calendar-${forceUpdate}`} userEmail={userInfo.email} isAdmin={verifiedAdmin} />} />
            <Route path="/current-schedule" element={<CurrentSchedule isAdmin={verifiedAdmin} />} />
            <Route path="/my-services" element={<MyServices />} />
            <Route path="/profile" element={<ProfileEdit />} />
            <Route path="/exchanges" element={<ShiftExchange />} />
            <Route path="/updated-schedule" element={<UpdatedSchedule />} />
            
            <Route path="/users" element={checkAdminRoute(<UserManagement key={`user-management-${forceUpdate}`} />)} />
            <Route path="/user-schedules" element={checkAdminRoute(<UserSchedules key={`user-schedules-${forceUpdate}`} />)} />
            <Route path="/schedule-upload" element={checkAdminRoute(<ScheduleUpload />)} />
            <Route path="/announcements" element={checkAdminRoute(<Announcements key={`announcements-${forceUpdate}`} />)} />
            <Route path="/config/database" element={checkAdminRoute(<DatabaseConfigInternal />)} />
            <Route path="/config/pdf-additional" element={checkAdminRoute(<PDFAdditionalConfig />)} />
            <Route path="/config/xlsx" element={checkAdminRoute(<XLSXConfig />)} />
            
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Dashboard;
