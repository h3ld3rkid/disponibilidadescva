
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const loginSchema = z.object({
  email: z.string().email({
    message: "Por favor, introduza um email válido.",
  }),
  password: z.string().min(6, {
    message: "Password deve ter pelo menos 6 caracteres.",
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// Sample user data - in a real app, this would come from a database
const users = [
  { email: "admin@gmail.com", password: "abcabc", role: "admin" },
  { email: "user@example.com", password: "password", role: "user" }
];

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      // Find user in our sample data
      const user = users.find(u => u.email === data.email && u.password === data.password);
      
      if (user) {
        // Store login info
        localStorage.setItem('mysqlConnection', JSON.stringify({
          email: data.email,
          role: user.role,
          isConnected: true
        }));
        
        toast({
          title: "Login bem sucedido",
          description: `Bem-vindo, ${data.email}`,
        });
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        throw new Error("Credenciais inválidas");
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast({
        title: "Falha no login",
        description: "Email ou password inválidos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md px-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="https://amares.cruzvermelha.pt/images/site/Amares.webp" 
              alt="Cruz Vermelha Amares" 
              className="h-24 object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Disponibilidades CVAmares</h1>
          <p className="text-gray-600 mt-2">Inicie sessão para aceder ao sistema</p>
        </div>
        
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>
              Introduza as suas credenciais para aceder ao sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="admin@gmail.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button type="submit" className="w-full bg-brand-indigo hover:bg-brand-darkblue" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A iniciar sessão...
                    </>
                  ) : (
                    "Entrar"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-gray-500">
            Admin padrão: admin@gmail.com / password: abcabc
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
