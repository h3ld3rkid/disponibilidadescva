
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, LogOut, Users, Table2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface ConnectionInfo {
  username: string;
  hostname: string;
  database: string;
  isConnected: boolean;
}

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Retrieve connection information from localStorage
    const storedConnection = localStorage.getItem('mysqlConnection');
    
    if (storedConnection) {
      setConnectionInfo(JSON.parse(storedConnection));
    } else {
      // Redirect to login if not connected
      toast({
        title: "Not connected",
        description: "Please log in to your database first",
        variant: "destructive",
      });
      navigate('/login');
    }
    
    setLoading(false);
  }, [navigate, toast]);

  const handleLogout = () => {
    localStorage.removeItem('mysqlConnection');
    toast({
      title: "Disconnected",
      description: "Successfully disconnected from database",
    });
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  // Sample data for the dashboard
  const sampleTables = [
    { name: "users", rows: 156, lastUpdated: "2023-10-15" },
    { name: "products", rows: 432, lastUpdated: "2023-10-20" },
    { name: "orders", rows: 1298, lastUpdated: "2023-10-22" },
    { name: "categories", rows: 28, lastUpdated: "2023-09-05" },
  ];

  const sampleUsers = [
    { id: 1, username: "admin", email: "admin@example.com", created: "2023-01-15" },
    { id: 2, username: "john_doe", email: "john@example.com", created: "2023-03-22" },
    { id: 3, username: "jane_smith", email: "jane@example.com", created: "2023-05-17" },
    { id: 4, username: "robert_johnson", email: "robert@example.com", created: "2023-07-30" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-brand-indigo" />
            <h1 className="text-xl font-semibold text-gray-900">MySQL Connect Portal</h1>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">
              Connected as <span className="font-medium">{connectionInfo?.username}</span>
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="flex items-center gap-1"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-8">
        {/* Connection summary */}
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle>Database Overview</CardTitle>
            <CardDescription>
              Connected to <span className="font-medium">{connectionInfo?.database}</span> at <span className="font-medium">{connectionInfo?.hostname}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-md">
                <Table2 className="h-8 w-8 text-brand-indigo" />
                <div>
                  <p className="text-sm text-gray-500">Tables</p>
                  <p className="text-2xl font-semibold">{sampleTables.length}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-md">
                <Users className="h-8 w-8 text-brand-indigo" />
                <div>
                  <p className="text-sm text-gray-500">Users</p>
                  <p className="text-2xl font-semibold">{sampleUsers.length}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-4 bg-slate-50 rounded-md">
                <Database className="h-8 w-8 text-brand-indigo" />
                <div>
                  <p className="text-sm text-gray-500">Size</p>
                  <p className="text-2xl font-semibold">24.6 MB</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tables and data sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Database tables */}
          <Card>
            <CardHeader>
              <CardTitle>Tables</CardTitle>
              <CardDescription>
                All tables in {connectionInfo?.database}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleTables.map((table) => (
                    <TableRow key={table.name}>
                      <TableCell className="font-medium">{table.name}</TableCell>
                      <TableCell>{table.rows}</TableCell>
                      <TableCell>{table.lastUpdated}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Users data */}
          <Card>
            <CardHeader>
              <CardTitle>Sample Data: Users</CardTitle>
              <CardDescription>
                Records from the users table
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.id}</TableCell>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.created}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
