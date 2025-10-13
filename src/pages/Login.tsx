import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabaseService } from '@/services/supabase';
import { sessionManager } from '@/services/sessionManager';
import Footer from '@/components/ui/footer';
import { Eye, EyeOff } from 'lucide-react';
const Login = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  useEffect(() => {
    // Check if user has a valid session
    const session = sessionManager.getCurrentSession();
    if (session) {
      // Redirect to dashboard if session is still valid
      navigate('/dashboard');
    }
  }, [navigate]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await supabaseService.checkLogin(email, password);
      if (response.success && response.user) {
        // Create session with expiration
        sessionManager.createSession({
          email: response.user.email,
          role: response.user.role,
          isConnected: true,
          name: response.user.name
        });

        // Show success toast
        toast({
          title: "Login bem-sucedido",
          description: "Bem-vindo ao sistema de Escalas Cruz Vermelha Amares.",
          variant: "default"
        });

        // Redirect to profile page if needs password change
        if (response.user.needsPasswordChange) {
          navigate('/dashboard/profile');
          toast({
            title: "Alteração de password necessária",
            description: "Por favor altere a sua password padrão.",
            variant: "default"
          });
        } else {
          // Redirect to dashboard
          navigate('/dashboard');
        }
      } else {
        // Show error toast
        toast({
          title: "Erro de Login",
          description: "Email ou palavra-passe incorretos.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Login error:', error);

      // Show error toast
      toast({
        title: "Erro de Conexão",
        description: "Ocorreu um erro ao conectar ao servidor.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <img src="https://amares.cruzvermelha.pt/images/site/Amares.webp" alt="Cruz Vermelha Amares" className="h-16 mb-6" />
      
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Disponibilidade Socorristas</CardTitle>
          <CardDescription className="text-center">
            Cruz Vermelha - Delegação de Amares
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="seu.email@exemplo.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Palavra-passe</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'A processar...' : 'Entrar'}
            </Button>
          </CardFooter>
        </form>
      </Card>
      
      <div className="mt-6 text-center text-sm text-gray-500">
        <p>Sistema desenvolvido para a Cruz Vermelha - Delegação de Amares</p>
      </div>
      <Footer />
    </div>;
};
export default Login;