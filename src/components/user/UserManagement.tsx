
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, 
  TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Dialog, DialogContent, DialogDescription, 
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Sheet, SheetContent, SheetDescription, 
  SheetHeader, SheetTitle, SheetTrigger 
} from "@/components/ui/sheet";
import { UserPlus, Pencil, UserX, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import UserForm from "./UserForm";

// Sample users data - in a real app, this would come from MySQL
const initialUsers = [
  { id: 1, name: "Administrator", email: "admin@gmail.com", role: "admin", active: true },
  { id: 2, name: "John Doe", email: "john@example.com", role: "user", active: true },
  { id: 3, name: "Jane Smith", email: "jane@example.com", role: "user", active: true },
  { id: 4, name: "Robert Johnson", email: "robert@example.com", role: "user", active: false },
];

const UserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);

  const handleCreateUser = (userData: any) => {
    try {
      // In a real app, this would send data to MySQL
      console.log("Creating user in MySQL:", userData);
      
      // Simulated successful creation
      const newUser = {
        id: users.length + 1,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        active: true,
      };
      
      setUsers([...users, newUser]);
      
      toast({
        title: "User created",
        description: `User ${userData.name} was successfully created`,
      });
      
      return true; // Success
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Failed to create user",
        description: "There was an error creating the user",
        variant: "destructive",
      });
      
      return false; // Failure
    }
  };

  const handleEditUser = (userData: any) => {
    try {
      // In a real app, this would update data in MySQL
      console.log("Updating user in MySQL:", userData);
      
      // Simulated successful update
      const updatedUsers = users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, name: userData.name, email: userData.email, role: userData.role }
          : user
      );
      
      setUsers(updatedUsers);
      setIsEditSheetOpen(false);
      
      toast({
        title: "User updated",
        description: `User ${userData.name} was successfully updated`,
      });
      
      return true; // Success
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Failed to update user",
        description: "There was an error updating the user",
        variant: "destructive",
      });
      
      return false; // Failure
    }
  };

  const toggleUserStatus = (userId: number) => {
    try {
      // In a real app, this would update user status in MySQL
      const userToToggle = users.find(user => user.id === userId);
      console.log(`${userToToggle?.active ? 'Deactivating' : 'Activating'} user in MySQL:`, userId);
      
      // Simulated successful status toggle
      const updatedUsers = users.map(user => 
        user.id === userId 
          ? { ...user, active: !user.active }
          : user
      );
      
      setUsers(updatedUsers);
      
      toast({
        title: userToToggle?.active ? "User deactivated" : "User activated",
        description: `User was successfully ${userToToggle?.active ? 'deactivated' : 'activated'}`,
      });
    } catch (error) {
      console.error("Error toggling user status:", error);
      toast({
        title: "Failed to update user status",
        description: "There was an error updating the user status",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Create, edit, and manage system users</CardDescription>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-brand-indigo hover:bg-brand-darkblue">
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new user account
                </DialogDescription>
              </DialogHeader>
              <UserForm onSubmit={handleCreateUser} />
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <span className={user.role === 'admin' ? 'text-brand-indigo font-medium' : ''}>
                      {user.role}
                    </span>
                  </TableCell>
                  <TableCell>
                    {user.active ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Sheet open={isEditSheetOpen && selectedUser?.id === user.id} onOpenChange={(open) => {
                        if (open) {
                          setSelectedUser(user);
                        }
                        setIsEditSheetOpen(open);
                      }}>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedUser(user);
                            setIsEditSheetOpen(true);
                          }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent>
                          <SheetHeader>
                            <SheetTitle>Edit User</SheetTitle>
                            <SheetDescription>
                              Update user information
                            </SheetDescription>
                          </SheetHeader>
                          {selectedUser && (
                            <div className="py-4">
                              <UserForm 
                                onSubmit={handleEditUser} 
                                defaultValues={{
                                  name: selectedUser.name,
                                  email: selectedUser.email,
                                  role: selectedUser.role,
                                }}
                              />
                            </div>
                          )}
                        </SheetContent>
                      </Sheet>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toggleUserStatus(user.id)}
                        className={user.active ? "text-red-500 hover:text-red-600" : "text-green-500 hover:text-green-600"}
                      >
                        {user.active ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagement;
