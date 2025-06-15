
import React, { useState } from 'react';
import { Menu, X, LogOut, User, Calendar, Users, FileText, Upload, Bell, ArrowLeftRight, Settings, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import ExchangeNotifications from './schedule/ExchangeNotifications';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavbarProps {
  email: string;
  role: string;
}

const Navbar: React.FC<NavbarProps> = ({ email, role }) => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    localStorage.removeItem('mysqlConnection');
    toast({
      title: "Sessão terminada",
      description: "Logout realizado com sucesso.",
    });
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard' && location.pathname === '/dashboard') return true;
    if (path !== '/dashboard' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const isAdmin = role === 'admin';

  const navigation = [
    { name: 'Início', href: '/dashboard', icon: Home },
    { name: 'Minha Escala', href: '/dashboard/schedule', icon: Calendar },
    { name: 'Escala Atual', href: '/dashboard/current-schedule', icon: FileText },
    { name: 'Trocas', href: '/dashboard/exchanges', icon: ArrowLeftRight },
  ];

  const adminNavigation = [
    { name: 'Utilizadores', href: '/dashboard/users', icon: Users },
    { name: 'Escalas dos Utilizadores', href: '/dashboard/user-schedules', icon: Calendar },
    { name: 'Carregar Escala', href: '/dashboard/schedule-upload', icon: Upload },
    { name: 'Avisos', href: '/dashboard/announcements', icon: Bell },
    { name: 'Configurações', href: '/dashboard/config/database', icon: Settings },
  ];

  return (
    <nav className="bg-red-700 shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <span className="text-white text-lg md:text-xl font-semibold">
                {isMobile ? 'CVA' : 'Cruz Vermelha Amares'}
              </span>
            </div>
            
            {!isMobile && (
              <div className="hidden lg:ml-6 lg:flex lg:space-x-4">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => navigate(item.href)}
                      className={`${
                        isActive(item.href)
                          ? 'border-white text-white'
                          : 'border-transparent text-red-100 hover:border-red-300 hover:text-white'
                      } inline-flex items-center px-2 xl:px-3 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                    >
                      <Icon className="h-4 w-4 mr-1 xl:mr-2" />
                      <span className="hidden xl:inline">{item.name}</span>
                      <span className="xl:hidden">{item.name.split(' ')[0]}</span>
                    </button>
                  );
                })}
                
                {isAdmin && (
                  <>
                    <div className="border-l border-red-600 mx-2" />
                    {adminNavigation.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.name}
                          onClick={() => navigate(item.href)}
                          className={`${
                            isActive(item.href)
                              ? 'border-white text-white'
                              : 'border-transparent text-red-100 hover:border-red-300 hover:text-white'
                          } inline-flex items-center px-2 xl:px-3 pt-1 border-b-2 text-sm font-medium transition-colors duration-200`}
                        >
                          <Icon className="h-4 w-4 mr-1 xl:mr-2" />
                          <span className="hidden xl:inline">{item.name}</span>
                          <span className="xl:hidden">
                            {item.name === 'Utilizadores' ? 'Users' : 
                             item.name === 'Escalas dos Utilizadores' ? 'Escalas' :
                             item.name === 'Carregar Escala' ? 'Upload' :
                             item.name === 'Configurações' ? 'Config' : item.name}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </div>

          <div className="hidden lg:flex items-center space-x-3">
            <ExchangeNotifications userEmail={email} />
            
            <div className="flex items-center space-x-3">
              <div className="text-red-100 text-sm">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  <span className="max-w-32 xl:max-w-none truncate">{email}</span>
                </div>
                {isAdmin && (
                  <div className="text-xs text-red-200">Admin</div>
                )}
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-800 hover:bg-red-900 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden xl:inline">Sair</span>
              </button>
            </div>
          </div>

          <div className="lg:hidden flex items-center space-x-2">
            <ExchangeNotifications userEmail={email} />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-red-100 hover:text-white hover:bg-red-800 p-2 rounded-md transition-colors duration-200"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-red-800">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.href);
                    setIsOpen(false);
                  }}
                  className={`${
                    isActive(item.href)
                      ? 'bg-red-900 text-white'
                      : 'text-red-100 hover:bg-red-700 hover:text-white'
                  } block px-3 py-2 rounded-md text-base font-medium w-full text-left transition-colors duration-200`}
                >
                  <Icon className="h-5 w-5 mr-3 inline" />
                  {item.name}
                </button>
              );
            })}
            
            {isAdmin && (
              <>
                <div className="border-t border-red-600 my-3" />
                <div className="text-red-200 text-xs uppercase font-semibold px-3 py-2">
                  Administração
                </div>
                {adminNavigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        navigate(item.href);
                        setIsOpen(false);
                      }}
                      className={`${
                        isActive(item.href)
                          ? 'bg-red-900 text-white'
                          : 'text-red-100 hover:bg-red-700 hover:text-white'
                      } block px-3 py-2 rounded-md text-base font-medium w-full text-left transition-colors duration-200`}
                    >
                      <Icon className="h-5 w-5 mr-3 inline" />
                      {item.name}
                    </button>
                  );
                })}
              </>
            )}
            
            <div className="border-t border-red-600 my-3" />
            <div className="px-3 py-2">
              <div className="text-red-100 text-sm">{email}</div>
              {isAdmin && (
                <div className="text-xs text-red-200">Administrador</div>
              )}
              <button
                onClick={handleLogout}
                className="mt-2 w-full bg-red-900 hover:bg-red-950 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
