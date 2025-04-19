import { DatabaseConfig, getDatabaseConfig } from '@/config/database';

interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  mechanographic_number: string;
  role: 'admin' | 'user';
  active: boolean;
  needs_password_change?: boolean;
}

// Simulate database operations
// In a real implementation, this would use a library like mysql2 to connect to the database
// But for now, we'll simulate the database operations
export const localDatabaseService = {
  // Check connection
  async checkConnection(config: DatabaseConfig): Promise<boolean> {
    console.log('Checking connection to local database', config);
    try {
      // In a real app, we would attempt to connect to the database here
      // For now, we'll simulate a successful connection
      localStorage.setItem('localDatabaseConnected', 'true');
      return true;
    } catch (error) {
      console.error('Error connecting to database:', error);
      localStorage.removeItem('localDatabaseConnected');
      return false;
    }
  },
  
  // Test connection with credentials
  async testConnection(config: DatabaseConfig): Promise<{ success: boolean; message: string }> {
    try {
      // Simulate testing connection
      console.log('Testing connection to:', config);
      
      // Simulate a slight delay to mimic network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Always return success for this simulation
      return { success: true, message: 'Conexão bem sucedida!' };
    } catch (error) {
      console.error('Connection test failed:', error);
      return { success: false, message: 'Falha na conexão. Verifique os dados e tente novamente.' };
    }
  },
  
  // Create a new user
  async createUser(userData: Omit<User, 'id' | 'active'>): Promise<User> {
    console.log('Creating user in local database', userData);
    
    // In a real implementation, this would insert into a MySQL database
    // For now, we'll simulate storing in localStorage
    const users = this.getAllUsersFromStorage();
    const newUser = {
      id: users.length + 1,
      name: userData.name,
      email: userData.email,
      mechanographic_number: userData.mechanographic_number,
      role: userData.role,
      active: true,
      needs_password_change: true,
      password: 'CVAmares'
    };
    
    users.push(newUser);
    localStorage.setItem('localUsers', JSON.stringify(users));
    
    return newUser;
  },
  
  // Delete a user
  async deleteUser(userId: number): Promise<{ success: boolean }> {
    console.log('Deleting user from local database', userId);
    
    const users = this.getAllUsersFromStorage();
    const filteredUsers = users.filter(user => user.id !== userId);
    
    if (filteredUsers.length === users.length) {
      throw new Error('User not found');
    }
    
    localStorage.setItem('localUsers', JSON.stringify(filteredUsers));
    
    return { success: true };
  },
  
  // Update an existing user
  async updateUser(userId: number, userData: Partial<User>): Promise<User> {
    console.log('Updating user in local database', userId, userData);
    
    const users = this.getAllUsersFromStorage();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    // Update the user
    users[userIndex] = {
      ...users[userIndex],
      ...(userData.name && { name: userData.name }),
      ...(userData.email && { email: userData.email }),
      ...(userData.mechanographic_number && { mechanographic_number: userData.mechanographic_number }),
      ...(userData.role && { role: userData.role }),
      ...(userData.active !== undefined && { active: userData.active }),
      ...(userData.needs_password_change !== undefined && { needs_password_change: userData.needs_password_change }),
    };
    
    localStorage.setItem('localUsers', JSON.stringify(users));
    
    return users[userIndex];
  },
  
  // Toggle user active status
  async toggleUserStatus(userId: number): Promise<{ success: boolean; active: boolean }> {
    console.log('Toggling user status in local database', userId);
    
    const users = this.getAllUsersFromStorage();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      throw new Error('User not found');
    }
    
    const newStatus = !users[userIndex].active;
    users[userIndex].active = newStatus;
    
    localStorage.setItem('localUsers', JSON.stringify(users));
    
    return {
      success: true,
      active: newStatus
    };
  },
  
  // Get all users
  async getAllUsers(): Promise<User[]> {
    console.log('Getting all users from local database');
    return this.getAllUsersFromStorage();
  },
  
  // Save user schedule
  async saveUserSchedule(userEmail: string, scheduleData: any): Promise<{ success: boolean }> {
    console.log('Saving schedule for user in local database', userEmail, scheduleData);
    
    // Get existing schedules or initialize an empty array
    const schedules = JSON.parse(localStorage.getItem('localUserSchedules') || '[]');
    
    // Find if this user already has a schedule entry
    const existingIndex = schedules.findIndex((s: any) => s.userEmail === userEmail);
    
    if (existingIndex !== -1) {
      // Update existing entry
      schedules[existingIndex] = {
        ...schedules[existingIndex],
        ...scheduleData,
        userEmail,
        updatedAt: new Date().toISOString()
      };
    } else {
      // Add new entry
      schedules.push({
        userEmail,
        ...scheduleData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    localStorage.setItem('localUserSchedules', JSON.stringify(schedules));
    
    // Dispatch event to refresh UI
    window.dispatchEvent(new CustomEvent('schedulesChanged'));
    
    return { success: true };
  },
  
  // Get user schedules
  async getUserSchedules(): Promise<any[]> {
    console.log('Getting all user schedules from local database');
    return JSON.parse(localStorage.getItem('localUserSchedules') || '[]');
  },
  
  // Delete user schedule
  async deleteUserSchedule(userEmail: string): Promise<{ success: boolean }> {
    console.log('Deleting schedule for user from local database', userEmail);
    
    const schedules = JSON.parse(localStorage.getItem('localUserSchedules') || '[]');
    const updatedSchedules = schedules.filter((s: any) => s.userEmail !== userEmail);
    
    localStorage.setItem('localUserSchedules', JSON.stringify(updatedSchedules));
    
    // Dispatch event to refresh UI
    window.dispatchEvent(new CustomEvent('schedulesChanged'));
    
    return { success: true };
  },
  
  // Request password reset
  async requestPasswordReset(email: string): Promise<{ success: boolean }> {
    console.log('Password reset requested for', email);
    
    const resetRequests = JSON.parse(localStorage.getItem('localPasswordResetRequests') || '[]');
    
    // Check if request already exists
    if (!resetRequests.includes(email)) {
      resetRequests.push(email);
      localStorage.setItem('localPasswordResetRequests', JSON.stringify(resetRequests));
    }
    
    return { success: true };
  },
  
  // Get password reset requests
  async getPasswordResetRequests(): Promise<string[]> {
    return JSON.parse(localStorage.getItem('localPasswordResetRequests') || '[]');
  },
  
  // Reset password for user
  async resetPassword(email: string): Promise<{ success: boolean }> {
    console.log('Resetting password for', email);
    
    const users = this.getAllUsersFromStorage();
    const userIndex = users.findIndex(user => user.email === email);
    
    if (userIndex !== -1) {
      // Set default password and flag to change
      users[userIndex].password = 'CVAmares';
      users[userIndex].needs_password_change = true;
      
      localStorage.setItem('localUsers', JSON.stringify(users));
      
      // Remove from reset requests
      const resetRequests = JSON.parse(localStorage.getItem('localPasswordResetRequests') || '[]');
      const updatedRequests = resetRequests.filter((e: string) => e !== email);
      localStorage.setItem('localPasswordResetRequests', JSON.stringify(updatedRequests));
    }
    
    return { success: true };
  },
  
  // Change password for user
  async changePassword(email: string, newPassword: string): Promise<{ success: boolean }> {
    console.log('Changing password for', email);
    
    const users = this.getAllUsersFromStorage();
    const userIndex = users.findIndex(user => user.email === email);
    
    if (userIndex !== -1) {
      // Update password and flag
      users[userIndex].password = newPassword;
      users[userIndex].needs_password_change = false;
      
      localStorage.setItem('localUsers', JSON.stringify(users));
    }
    
    return { success: true };
  },
  
  // Check login credentials
  async checkLogin(email: string, password: string): Promise<{ success: boolean; user?: { email: string; role: string; needsPasswordChange: boolean } }> {
    console.log('Checking login for', email);
    
    const users = this.getAllUsersFromStorage();
    const user = users.find(user => user.email === email);
    
    if (!user) {
      console.log('User not found');
      return { success: false };
    }
    
    if (!user.active) {
      console.log('User account is inactive');
      return { success: false };
    }
    
    // In a real scenario, you would compare the hashed password
    // Here we're just checking if the password is 'CVAmares' for default or matches the stored password
    const passwordMatches = password === 'CVAmares' || password === user.password;
    
    if (!passwordMatches) {
      console.log('Password does not match');
      return { success: false };
    }
    
    return { 
      success: true,
      user: {
        email: user.email,
        role: user.role,
        needsPasswordChange: user.needs_password_change || false
      }
    };
  },
  
  // Helper method to get all users from localStorage
  getAllUsersFromStorage(): User[] {
    const storedUsers = localStorage.getItem('localUsers');
    
    if (!storedUsers) {
      // Initialize with default admin user if no users exist
      const defaultUsers = [
        { id: 1, name: "Administrador", email: "admin@gmail.com", mechanographic_number: "00001", role: 'admin' as const, active: true, needs_password_change: false }
      ];
      localStorage.setItem('localUsers', JSON.stringify(defaultUsers));
      return defaultUsers;
    }
    
    try {
      return JSON.parse(storedUsers);
    } catch (error) {
      console.error('Error parsing stored users:', error);
      return [];
    }
  }
};
