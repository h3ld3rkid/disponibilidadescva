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

  async getUserByEmail(email: string) {
    return userService.getUserByEmail(email);
  },

  // Schedule service methods
  async getSchedules(filters?: any) {
    return scheduleService.getSchedules(filters);
  },

  async createSchedule(scheduleData: any) {
    return scheduleService.createSchedule(scheduleData);
  },

  async updateSchedule(scheduleId: string, scheduleData: any) {
    return scheduleService.updateSchedule(scheduleId, scheduleData);
  },

  async deleteSchedule(scheduleId: string) {
    return scheduleService.deleteSchedule(scheduleId);
  },

  async getUserSchedules(userEmail: string) {
    return scheduleService.getUserSchedules(userEmail);
  },

  async getCurrentSchedules() {
    return scheduleService.getCurrentSchedules();
  },

  async uploadSchedules(schedules: any[]) {
    return scheduleService.uploadSchedules(schedules);
  },

  // Announcement service methods
  async getAnnouncements() {
    return announcementService.getAnnouncements();
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
