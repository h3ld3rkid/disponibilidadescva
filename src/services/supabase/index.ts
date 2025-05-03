
import { userService } from './userService';
import { authService } from './authService';
import { scheduleService } from './scheduleService';

export const supabaseService = {
  ...userService,
  ...authService,
  ...scheduleService
};

export { userService, authService, scheduleService };
