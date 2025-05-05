
import { userService } from './userService';
import { authService } from './authService';
import { scheduleService } from './scheduleService';
import { announcementService } from './announcementService';

export const supabaseService = {
  ...userService,
  ...authService,
  ...scheduleService,
  ...announcementService
};

export { userService, authService, scheduleService, announcementService };
