
import React, { useEffect, useState } from 'react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import UserManagement from '@/components/user/UserManagement';
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar';
import UserSchedules from '@/components/schedule/UserSchedules';
import Announcements from '@/components/announcements/Announcements';
import AnnouncementsList from '@/components/announcements/AnnouncementsList';
import ProfileEdit from '@/components/profile/ProfileEdit';
import Home from '@/components/Home';
import CurrentSchedule from '@/components/schedule/CurrentSchedule';
import ScheduleUpload from '@/components/admin/ScheduleUpload';

interface UserInfo {
  email: string;
  role: string;
  isConnected: boolean;
}

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [forceUpdate, setForceUpdate] = useState(0);

  useEffect(() => {
    // Retrieve user information from localStorage
    const storedUser = localStorage.getItem('mysqlConnection');
    
    if (storedUser) {
      setUserInfo(JSON.parse(storedUser));
    } else {
      // Redirect to login if not connected
      toast({
        title: "Sessão não iniciada",
        description: "Por favor, inicie sessão primeiro",
        variant: "destructive",
      });
      navigate('/login');
    }
    
    setLoading(false);
    
    // Listen for role changes
    const handleRoleChange = () => {
      const updatedUser = localStorage.getItem('mysqlConnection');
      if (updatedUser) {
        setUserInfo(JSON.parse(updatedUser));
        setForceUpdate(prev => prev + 1);
      }
    };
    
    window.addEventListener('userRoleChanged', handleRoleChange);
    
    return () => {
      window.removeEventListener('userRoleChanged', handleRoleChange);
    };
  }, [navigate, toast]);

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

  const isAdmin = userInfo.role === 'admin';

  // Check if user is trying to access admin-only routes
  const checkAdminRoute = (element: React.ReactNode) => {
    return isAdmin ? element : <Navigate to="/dashboard" replace />;
  };

  // Check if user is trying to access user-only routes
  const checkUserAccess = (path: string) => {
    // Paths allowed for regular users
    const allowedUserPaths = ['/', '/schedule', '/current-schedule', '/profile'];
    
    // Admin has access to all routes
    if (isAdmin) return true;
    
    // Check if the path is in the allowed list for users
    return allowedUserPaths.includes(path);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <Navbar key={`nav-${forceUpdate}`} email={userInfo.email} role={userInfo.role} />

      {/* Title Bar - below navbar */}
      <div className="bg-white border-b border-gray-200 py-4 mb-4">
        <div className="container mx-auto px-4 flex items-center">
          <img 
            src="https://amares.cruzvermelha.pt/images/site/Amares.webp" 
            alt="Cruz Vermelha Amares" 
            className="h-8 object-contain mr-3" 
          />
          <h1 className="text-2xl font-semibold text-gray-900">Escalas Cruz Vermelha Amares</h1>
        </div>
      </div>

      {/* Main content with nested routes - restrict user access */}
      <div className="flex-1">
        <div className="w-full max-w-[1440px] mx-auto px-4">
          <AnnouncementsList />
          <Routes>
            {/* Routes accessible to all users */}
            <Route path="/" element={<Home userEmail={userInfo.email} isAdmin={isAdmin} />} />
            <Route path="/schedule" element={<ScheduleCalendar userEmail={userInfo.email} isAdmin={isAdmin} />} />
            <Route path="/current-schedule" element={<CurrentSchedule isAdmin={isAdmin} />} />
            <Route path="/profile" element={<ProfileEdit />} />
            
            {/* Admin-only routes */}
            <Route path="/users" element={checkAdminRoute(<UserManagement />)} />
            <Route path="/user-schedules" element={checkAdminRoute(<UserSchedules />)} />
            <Route path="/schedule-upload" element={checkAdminRoute(<ScheduleUpload />)} />
            <Route path="/announcements" element={checkAdminRoute(<Announcements />)} />
            
            {/* Redirect to home if path not found or not authorized */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
