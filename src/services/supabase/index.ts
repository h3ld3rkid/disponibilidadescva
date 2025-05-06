
import { userService } from './userService';
import { authService } from './authService';
import { scheduleService } from './scheduleService';
import { announcementService } from './announcementService';
import { systemSettingsService } from './systemSettingsService';

export const supabaseService = {
  ...userService,
  ...authService,
  ...scheduleService,
  ...announcementService,
  ...systemSettingsService
};

export { userService, authService, scheduleService, announcementService, systemSettingsService };
