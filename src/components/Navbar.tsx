
import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  X, 
  Home, 
  Calendar, 
  Users, 
  UserCheck, 
  Upload, 
  Megaphone, 
  Settings, 
  LogOut, 
  User,
  ArrowLeftRight,
  CalendarCheck
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ExchangeNotifications from '@/components/schedule/ExchangeNotifications';

interface NavbarProps {
  email: string;
  role: string;
}

const Navbar: React.FC<NavbarProps> = ({ email, role }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isAdmin = role === 'admin';

  useEffect(() => {
    const storedUser = localStorage.getItem('mysqlConnection');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUserInfo(parsedUser);
      } catch (error) {
        console.error("Error parsing user info:", error);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('mysqlConnection');
    toast({
      title: "Sessão terminada",
      description: "A sua sessão foi terminada com sucesso",
    });
    navigate('/login');
  };

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Início' },
    { path: '/dashboard/schedule', icon: Calendar, label: 'Calendário' },
    { path: '/dashboard/current-schedule', icon: CalendarCheck, label: 'Escala Atual' },
    { path: '/dashboard/exchanges', icon: ArrowLeftRight, label: 'Trocas' },
    { path: '/dashboard/profile', icon: User, label: 'Perfil' },
  ];

  const adminItems = [
    { path: '/dashboard/users', icon: Users, label: 'Utilizadores' },
    { path: '/dashboard/user-schedules', icon: UserCheck, label: 'Escalas' },
    { path: '/dashboard/schedule-upload', icon: Upload, label: 'Upload' },
    { path: '/dashboard/announcements', icon: Megaphone, label: 'Anúncios' },
    { path: '/dashboard/config/database', icon: Settings, label: 'Configuração' },
  ];

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link to="/dashboard" className="flex items-center space-x-2">
              <img 
                src="https://amares.cruzvermelha.pt/images/site/Amares.webp" 
                alt="Cruz Vermelha Amares" 
                className="h-8 w-auto" 
              />
              <span className="font-semibold text-lg text-gray-900 hidden sm:block">
                Escalas CVA
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActivePath(item.path)
                    ? 'bg-red-100 text-red-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
            
            {isAdmin && (
              <>
                <div className="h-6 w-px bg-gray-300 mx-2" />
                {adminItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActivePath(item.path)
                        ? 'bg-red-100 text-red-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center space-x-3">
            {/* Exchange Notifications */}
            {userInfo?.email && (
              <ExchangeNotifications userEmail={userInfo.email} />
            )}
            
            {/* User Info */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium text-gray-900">
                {userInfo?.name || email}
              </span>
              <span className="text-xs text-gray-500">
                Nº {userInfo?.mechanographic_number || 'N/A'}
                {isAdmin && (
                  <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                    Admin
                  </span>
                )}
              </span>
            </div>

            {/* Logout Button */}
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-gray-600 hover:text-red-600"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:ml-2 sm:inline">Sair</span>
            </Button>

            {/* Mobile Menu Button */}
            <Button
              onClick={() => setIsOpen(!isOpen)}
              variant="ghost"
              size="sm"
              className="md:hidden"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="flex flex-col space-y-2">
              {/* User Info Mobile */}
              <div className="px-3 py-2 bg-gray-50 rounded-md mb-2">
                <div className="text-sm font-medium text-gray-900">
                  {userInfo?.name || email}
                </div>
                <div className="text-xs text-gray-500">
                  Nº {userInfo?.mechanographic_number || 'N/A'}
                  {isAdmin && (
                    <span className="ml-2 bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs font-medium">
                      Admin
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation Items */}
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActivePath(item.path)
                      ? 'bg-red-100 text-red-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              ))}
              
              {isAdmin && (
                <>
                  <div className="h-px bg-gray-300 my-2" />
                  <div className="text-xs font-medium text-gray-500 px-3 py-1">
                    Administração
                  </div>
                  {adminItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActivePath(item.path)
                          ? 'bg-red-100 text-red-700'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
