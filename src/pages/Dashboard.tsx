
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
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);

  // Function to check and update user info
  const updateUserInfo = () => {
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserInfo(parsedUser);
        console.log("User info updated:", parsedUser);
      } catch (error) {
        console.error("Error parsing user info:", error);
        // Redirect to login if parse error
        navigate('/login');
      }
    } else {
      // Redirect to login if not connected
      toast({
        title: "Sessão não iniciada",
        description: "Por favor, inicie sessão primeiro",
        variant: "destructive",
      });
      navigate('/login');
    }
  };
  
  // Update the current path when it changes
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
    // Initial user info load
    updateUserInfo();
    setLoading(false);
    
    // Listen for role changes
    const handleRoleChange = () => {
      console.log("Role change event detected");
      updateUserInfo();
      setForceUpdate(prev => prev + 1);
    };
    
    // Listen for announcements changes to refresh the UI
    const handleAnnouncementsChange = () => {
      console.log("Announcements change event detected");
      setForceUpdate(prev => prev + 1);
    };
    
    // Listen for schedule changes
    const handleSchedulesChange = () => {
      console.log("Schedule change event detected");
      setForceUpdate(prev => prev + 1);
    };
    
    window.addEventListener('userRoleChanged', handleRoleChange);
    window.addEventListener('announcementsChanged', handleAnnouncementsChange);
    window.addEventListener('schedulesChanged', handleSchedulesChange);
    
    // Check for user info changes frequently
    const userInfoTimer = setInterval(() => {
      updateUserInfo();
    }, 2000); // Check more frequently for immediate role change effect
    
    return () => {
      window.removeEventListener('userRoleChanged', handleRoleChange);
      window.removeEventListener('announcementsChanged', handleAnnouncementsChange);
      window.removeEventListener('schedulesChanged', handleSchedulesChange);
      clearInterval(userInfoTimer);
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

  // Current path to determine if we should show announcements list
  const isHomePage = currentPath === '/dashboard' || currentPath === '/dashboard/';

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
          {/* Only show announcements list on non-Home pages since Home already displays announcements */}
          {!isHomePage && <AnnouncementsList key={`announcements-list-${forceUpdate}`} />}
          
          <Routes>
            {/* Routes accessible to all users */}
            <Route path="/" element={<Home userEmail={userInfo.email} isAdmin={isAdmin} />} />
            <Route path="/schedule" element={<ScheduleCalendar key={`schedule-calendar-${forceUpdate}`} userEmail={userInfo.email} isAdmin={isAdmin} />} />
            <Route path="/current-schedule" element={<CurrentSchedule isAdmin={isAdmin} />} />
            <Route path="/profile" element={<ProfileEdit />} />
            
            {/* Admin-only routes */}
            <Route path="/users" element={checkAdminRoute(<UserManagement key={`user-management-${forceUpdate}`} />)} />
            <Route path="/user-schedules" element={checkAdminRoute(<UserSchedules key={`user-schedules-${forceUpdate}`} />)} />
            <Route path="/schedule-upload" element={checkAdminRoute(<ScheduleUpload />)} />
            <Route path="/announcements" element={checkAdminRoute(<Announcements key={`announcements-${forceUpdate}`} />)} />
            
            {/* Redirect to home if path not found or not authorized */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
