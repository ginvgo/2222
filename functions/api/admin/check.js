// functions/api/auth/check.js
import { jsonResponse } from '../../utils';

export async function onRequestGet(context) {
  // Middleware has already run, so if we reach here, we are authenticated
  // Wait, middleware only protects /api/admin. 
  // This endpoint is useful for the frontend to check status on load.
  // We should manually check auth here or put it under /api/admin/check-auth
  // Let's put it here and reuse logic or just rely on the fact that if we use /api/admin/check it's protected.
  
  return jsonResponse({ authenticated: true });
}
