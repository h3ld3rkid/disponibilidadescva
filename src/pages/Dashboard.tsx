
import React, { useEffect, useState } from 'react';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import Navbar from '@/components/Navbar';
import UserManagement from '@/components/user/UserManagement';
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar';
import UserSchedules from '@/components/schedule/UserSchedules';
import Announcements from '@/components/announcements/Announcements';
import Home from '@/components/Home';

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
    <div className="min-h-screen bg-slate-50">
      {/* Navbar */}
      <Navbar email={userInfo.email} role={userInfo.role} />

      {/* Main content with nested routes */}
      <Routes>
        <Route path="/" element={<Home userEmail={userInfo.email} isAdmin={isAdmin} />} />
        <Route path="/schedule" element={<ScheduleCalendar userEmail={userInfo.email} isAdmin={isAdmin} />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/user-schedules" element={<UserSchedules />} />
        <Route path="/announcements" element={isAdmin ? <Announcements /> : <Home userEmail={userInfo.email} isAdmin={isAdmin} />} />
        <Route path="/profile" element={<div className="container mx-auto px-4 py-8">Funcionalidade em desenvolvimento</div>} />
        <Route path="*" element={<div className="container mx-auto px-4 py-8">Página não encontrada</div>} />
      </Routes>
    </div>
  );
};

export default Dashboard;
