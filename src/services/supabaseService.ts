
import { supabase } from './supabase/client';
import { authService } from './supabase/authService';
import { userService } from './supabase/userService';
import { scheduleService } from './supabase/scheduleService';
import { announcementService } from './supabase/announcementService';
import { optimizedAuthService } from './supabase/optimizedAuthService';

export const supabaseService = {
  // Use optimized auth service
  async checkLogin(email: string, password: string) {
    return optimizedAuthService.checkLogin(email, password);
  },

  async changePassword(email: string, newPassword: string) {
    return optimizedAuthService.changePassword(email, newPassword);
  },

  async requestPasswordReset(email: string) {
    return optimizedAuthService.requestPasswordReset(email);
  },

  // Auth service methods
  async getPasswordResetRequests() {
    return authService.getPasswordResetRequests();
  },

  async resetPassword(email: string) {
    return authService.resetPassword(email);
  },

  // User service methods
  async getAllUsers() {
    return userService.getAllUsers();
  },

  async createUser(userData: any) {
    return userService.createUser(userData);
  },

  async updateUser(userId: string, userData: any) {
    return userService.updateUser(userId, userData);
  },

  async deleteUser(userId: string) {
    return userService.deleteUser(userId);
  },

  // Schedule service methods
  async saveSchedule(userEmail: string, userName: string, scheduleData: any) {
    return scheduleService.saveSchedule(userEmail, userName, scheduleData);
  },

  async getUserSchedules(userEmail?: string) {
    return scheduleService.getUserSchedules(userEmail);
  },

  async deleteUserSchedule(userEmail: string) {
    return scheduleService.deleteUserSchedule(userEmail);
  },

  // Announcement service methods
  async getAllAnnouncements() {
    return announcementService.getAllAnnouncements();
  },

  async getActiveAnnouncements() {
    return announcementService.getActiveAnnouncements();
  },

  async createAnnouncement(announcementData: any) {
    return announcementService.createAnnouncement(announcementData);
  },

  async updateAnnouncement(announcementId: string, announcementData: any) {
    return announcementService.updateAnnouncement(announcementId, announcementData);
  },

  async deleteAnnouncement(announcementId: string) {
    return announcementService.deleteAnnouncement(announcementId);
  },

  // Direct Supabase client access for custom queries
  getClient() {
    return supabase;
  }
};
