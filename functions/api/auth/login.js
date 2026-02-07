// functions/api/auth/login.js
import { jsonResponse, errorResponse, hashPassword, getAdminConfig } from '../../utils';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const { username, password } = await request.json();

    const { username: validUsername, passwordHash: validPasswordHash, secret } = await getAdminConfig(env);

    const inputHash = await hashPassword(password);

    // Debugging Login Issues
    console.log(`Login Attempt:`);
    console.log(`Input Username: ${username}, Expected: ${validUsername}`);
    console.log(`Input Hash: ${inputHash}`);
    console.log(`Expected Hash: ${validPasswordHash}`);
    console.log(`Match: ${username === validUsername && inputHash === validPasswordHash}`);

    if (username === validUsername && inputHash === validPasswordHash) {
      // Create Token
      const payload = JSON.stringify({
        sub: username,
        exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
      });
      const signature = await sign(payload, secret);
      const token = `${btoa(payload)}.${signature}`;

      const response = jsonResponse({ success: true });
      
      // Set Cookie
      response.headers.append('Set-Cookie', `admin_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
      
      return response;
    }

    return errorResponse('Invalid credentials', 401);
  } catch (e) {
    return errorResponse(e.message);
  }
}

async function sign(data, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey(
        'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
