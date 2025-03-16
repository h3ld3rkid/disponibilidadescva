
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Database } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const loginSchema = z.object({
  username: z.string().min(2, {
    message: "Username must be at least 2 characters.",
  }),
  password: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }),
  hostname: z.string().min(1, {
    message: "Hostname is required.",
  }),
  port: z.string().regex(/^\d+$/, {
    message: "Port must be a number.",
  }).optional().transform(val => val || "3306"),
  database: z.string().min(1, {
    message: "Database name is required.",
  }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const Login = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
      hostname: "localhost",
      port: "3306",
      database: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    
    try {
      // In a real application, this would be an API call to your backend
      // that would authenticate with MySQL
      console.log("Connecting to MySQL with:", data);
      
      // Simulate an API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For demo purposes, we'll simulate a successful connection
      // In a real app, this would be the result of the API call
      const connectionSuccessful = true;
      
      if (connectionSuccessful) {
        // Store connection info (in a real app, you'd store a token instead)
        localStorage.setItem('mysqlConnection', JSON.stringify({
          username: data.username,
          hostname: data.hostname,
          database: data.database,
          isConnected: true
        }));
        
        toast({
          title: "Connection successful",
          description: `Connected to ${data.database} as ${data.username}`,
        });
        
        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        throw new Error("Unable to connect to database");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Connection failed",
        description: "Please check your credentials and try again.",
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
            <Database className="h-12 w-12 text-brand-indigo" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MySQL Connect Portal</h1>
          <p className="text-gray-600 mt-2">Connect to your MySQL database</p>
        </div>
        
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle>Database Login</CardTitle>
            <CardDescription>
              Enter your MySQL database credentials
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="hostname"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hostname</FormLabel>
                      <FormControl>
                        <Input placeholder="localhost" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex gap-4">
                  <FormField
                    control={form.control}
                    name="port"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Port</FormLabel>
                        <FormControl>
                          <Input placeholder="3306" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="database"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>Database</FormLabel>
                        <FormControl>
                          <Input placeholder="mydatabase" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="root" {...field} />
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
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center text-sm text-gray-500">
            Your credentials are stored locally and used only to connect to your database
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Login;
