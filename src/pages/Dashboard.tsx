
import React, { useEffect, useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import UserManagement from '@/components/user/UserManagement';
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar';
import UserSchedules from '@/components/schedule/UserSchedules';
import Announcements from '@/components/announcements/Announcements';
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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Navbar */}
      <Navbar email={userInfo.email} role={userInfo.role} />

      {/* Title Bar - moved below navbar */}
      <div className="bg-white border-b border-gray-200 py-4 mb-4 mt-2">
        <div className="container mx-auto px-4 flex items-center">
          <img 
            src="https://amares.cruzvermelha.pt/images/site/Amares.webp" 
            alt="Cruz Vermelha Amares" 
            className="h-8 object-contain mr-3" 
          />
          <h1 className="text-2xl font-semibold text-gray-900">Escalas Cruz Vermelha Amares</h1>
        </div>
      </div>

      {/* Main content with nested routes */}
      <div className="flex-1">
        <div className="w-full max-w-[1440px] mx-auto px-4">
          <Routes>
            <Route path="/" element={<Home userEmail={userInfo.email} isAdmin={isAdmin} />} />
            <Route path="/schedule" element={<ScheduleCalendar userEmail={userInfo.email} isAdmin={isAdmin} />} />
            <Route path="/current-schedule" element={<CurrentSchedule isAdmin={isAdmin} />} />
            <Route path="/users" element={isAdmin ? <UserManagement /> : <Home userEmail={userInfo.email} isAdmin={isAdmin} />} />
            <Route path="/user-schedules" element={isAdmin ? <UserSchedules /> : <Home userEmail={userInfo.email} isAdmin={isAdmin} />} />
            <Route path="/schedule-upload" element={isAdmin ? <ScheduleUpload /> : <Home userEmail={userInfo.email} isAdmin={isAdmin} />} />
            <Route path="/announcements" element={isAdmin ? <Announcements /> : <Home userEmail={userInfo.email} isAdmin={isAdmin} />} />
            <Route path="/profile" element={<ProfileEdit />} />
            <Route path="*" element={<div className="container mx-auto px-4 py-8">Página não encontrada</div>} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
