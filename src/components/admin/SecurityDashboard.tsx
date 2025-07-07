import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Users, Activity, RefreshCw } from 'lucide-react';
import { securityService, SecurityLog } from '@/services/securityService';
import { useToast } from "@/hooks/use-toast";

const SecurityDashboard = () => {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalLogins: 0,
    failedLogins: 0,
    suspiciousActivities: 0,
    uniqueUsers: 0
  });
  const [recentLogs, setRecentLogs] = useState<SecurityLog[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      
      // Load data in parallel
      const [statsData, logsData, suspiciousData] = await Promise.all([
        securityService.getSecurityStats(24),
        securityService.getSecurityLogs(50),
        securityService.getSuspiciousActivities(24)
      ]);

      setStats(statsData);
      setRecentLogs(logsData);
      setSuspiciousActivities(suspiciousData);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados de segurança",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadSecurityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'successful_login':
        return 'bg-green-100 text-green-800';
      case 'failed_login':
        return 'bg-red-100 text-red-800';
      case 'suspicious_activity':
        return 'bg-orange-100 text-orange-800';
      case 'password_changed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'suspicious_activity':
        return <AlertTriangle className="h-4 w-4" />;
      case 'successful_login':
        return <Shield className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatEventType = (eventType: string) => {
    const translations: { [key: string]: string } = {
      'successful_login': 'Login Bem-sucedido',
      'failed_login': 'Login Falhado',
      'suspicious_activity': 'Atividade Suspeita',
      'password_changed': 'Senha Alterada',
      'password_change_failed': 'Falha na Alteração de Senha'
    };
    return translations[eventType] || eventType;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-PT');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard de Segurança</h2>
        <Button onClick={loadSecurityData} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Security Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Logins (24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-green-600" />
              <span className="text-2xl font-bold">{stats.totalLogins}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tentativas Falhadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="text-2xl font-bold">{stats.failedLogins}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Atividades Suspeitas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span className="text-2xl font-bold">{stats.suspiciousActivities}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Utilizadores Únicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-2xl font-bold">{stats.uniqueUsers}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suspicious Activities Alert */}
      {suspiciousActivities.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-orange-800 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Atividades Suspeitas Detectadas
            </CardTitle>
            <CardDescription className="text-orange-700">
              {suspiciousActivities.length} atividade(s) suspeita(s) nas últimas 24 horas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {suspiciousActivities.slice(0, 3).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <span className="font-medium">{activity.user_email}</span>
                    <p className="text-sm text-gray-600">
                      {activity.details && typeof activity.details === 'object' && 'reason' in activity.details
                        ? `Razão: ${activity.details.reason}`
                        : 'Atividade suspeita detectada'
                      }
                    </p>
                  </div>
                  <span className="text-sm text-gray-500">
                    {formatDate(activity.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Security Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Registos de Segurança Recentes</CardTitle>
          <CardDescription>
            Últimos 50 eventos de segurança
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  {getEventTypeIcon(log.event_type)}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{log.user_email}</span>
                      <Badge 
                        variant="secondary"
                        className={getEventTypeColor(log.event_type)}
                      >
                        {formatEventType(log.event_type)}
                      </Badge>
                      {!log.success && (
                        <Badge variant="destructive" className="text-xs">
                          Falhado
                        </Badge>
                      )}
                    </div>
                    {log.details && typeof log.details === 'object' && (
                      <p className="text-sm text-gray-600 mt-1">
                        {JSON.stringify(log.details, null, 2)}
                      </p>
                    )}
                  </div>
                </div>
                <span className="text-sm text-gray-500">
                  {formatDate(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecurityDashboard;