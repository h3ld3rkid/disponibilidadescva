
import { userService } from './userService';
import { authService } from './authService';
import { scheduleService } from './scheduleService';
import { announcementService } from './announcementService';
import { systemSettingsService } from './systemSettingsService';
import { shiftExchangeService } from './shiftExchangeService';

export const supabaseService = {
  ...userService,
  ...authService,
  ...scheduleService,
  ...announcementService,
  ...systemSettingsService,
  ...shiftExchangeService
};

export { 
  userService, 
  authService, 
  scheduleService, 
  announcementService, 
  systemSettingsService,
  shiftExchangeService 
};
