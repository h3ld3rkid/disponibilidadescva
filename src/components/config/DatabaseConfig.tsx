
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { DatabaseConfig, defaultDatabaseConfig, saveDatabaseConfig } from '@/config/database';
import { localDatabaseService } from '@/services/localDatabaseService';
import { useToast } from '@/hooks/use-toast';

const DatabaseConfigForm = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [config, setConfig] = useState<DatabaseConfig>(() => {
    // Get saved config from localStorage or use default
    const storedConfig = localStorage.getItem('databaseConfig');
    if (storedConfig) {
      try {
        return JSON.parse(storedConfig);
      } catch (error) {
        console.error('Error parsing config:', error);
        return defaultDatabaseConfig;
      }
    }
    return defaultDatabaseConfig;
  });
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig(prev => ({
      ...prev,
      [name]: name === 'port' ? parseInt(value, 10) || 3306 : value
    }));
  };

  const handleTestConnection = async () => {
    setIsLoading(true);
    setTestResult(null);
    
    try {
      const result = await localDatabaseService.testConnection(config);
      setTestResult(result);
      
      if (result.success) {
        toast({
          title: "Conexão bem sucedida",
          description: "A conexão com a base de dados foi estabelecida com sucesso.",
          variant: "default",
        });
      } else {
        toast({
          title: "Falha na conexão",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      setTestResult({ success: false, message: 'Ocorreu um erro ao testar a conexão.' });
      
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao testar a conexão. Verifique os logs para mais detalhes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsLoading(true);
    
    try {
      // Save configuration
      saveDatabaseConfig(config);
      
      // Test connection with new config
      const result = await localDatabaseService.checkConnection(config);
      
      if (result) {
        toast({
          title: "Configuração salva",
          description: "A configuração da base de dados foi salva com sucesso. Redirecionando para o login.",
          variant: "default",
        });
        
        // Force logout since we're changing database
        localStorage.removeItem('mysqlConnection');
        
        // Redirect to login after short delay
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        toast({
          title: "Atenção",
          description: "A configuração foi salva, mas não foi possível estabelecer conexão.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao salvar a configuração.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setConfig(defaultDatabaseConfig);
    setTestResult(null);
    
    toast({
      title: "Configuração redefinida",
      description: "A configuração foi redefinida para os valores padrão.",
      variant: "default",
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Configuração da Base de Dados Local</CardTitle>
        <CardDescription>Configure a conexão com a base de dados MySQL local (XAMPP)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="host">Host</Label>
          <Input 
            id="host" 
            name="host" 
            value={config.host} 
            onChange={handleChange} 
            placeholder="localhost" 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="port">Porta</Label>
          <Input 
            id="port" 
            name="port" 
            type="number" 
            value={config.port} 
            onChange={handleChange} 
            placeholder="3306" 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="user">Utilizador</Label>
          <Input 
            id="user" 
            name="user" 
            value={config.user} 
            onChange={handleChange} 
            placeholder="root" 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Palavra-passe</Label>
          <Input 
            id="password" 
            name="password" 
            type="password" 
            value={config.password} 
            onChange={handleChange} 
            placeholder="Deixe em branco se não tiver palavra-passe" 
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="database">Nome da Base de Dados</Label>
          <Input 
            id="database" 
            name="database" 
            value={config.database} 
            onChange={handleChange} 
            placeholder="cruz_vermelha_amares" 
          />
        </div>
        
        {testResult && (
          <Alert variant={testResult.success ? "default" : "destructive"}>
            {testResult.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <AlertCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={isLoading}>
            Redefinir
          </Button>
          <Button variant="outline" onClick={handleTestConnection} disabled={isLoading}>
            {isLoading ? 'A testar...' : 'Testar Conexão'}
          </Button>
        </div>
        <Button onClick={handleSaveConfig} disabled={isLoading}>
          {isLoading ? 'A guardar...' : 'Guardar'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DatabaseConfigForm;
