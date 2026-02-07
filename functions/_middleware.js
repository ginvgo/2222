// functions/_middleware.js
import { jsonResponse, errorResponse, getAdminConfig } from './utils';

const ADMIN_COOKIE_NAME = 'admin_session';

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 1. Admin Area Protection
  if (path.startsWith('/admin') || path.startsWith('/api/admin')) {
      return handleAdminAuth(context);
  }

  // 2. Public Assets & API - Allow
  if (path.startsWith('/assets/') || path.startsWith('/api/') || path === '/' || path === '/index.html' || path === '/favicon.ico') {
      return next();
  }

  // 3. Project Access & JS Injection
  const segments = path.split('/').filter(p => p);
  if (segments.length > 0) {
      const folderName = segments[0];
      
      try {
          const project = await env.DB.prepare('SELECT id, is_encrypted, js_injections FROM projects WHERE folder_path = ?').bind(folderName).first();
          
          if (project) {
              // Auth Check
              if (project.is_encrypted) {
                  const authRes = await handleProjectAuth(context, project);
                  // If authRes is a Redirect or Error, return it. 
                  // If it's null, it means "Authorized, proceed".
                  // But my handleProjectAuth returns a Response (redirect) or calls next().
                  // I need to change handleProjectAuth to return true/false or response.
                  
                  // Let's refactor handleProjectAuth to return a Response ONLY if auth fails or setting cookie.
                  // If it returns null, we proceed.
                  const maybeResponse = await checkProjectAuth(context, project);
                  if (maybeResponse) return maybeResponse;
              }

              // Proceed to get asset
              let response = await next();
              
              // JS Injection (HTMLRewriter)
              // Only if it's HTML
              const contentType = response.headers.get('Content-Type');
              if (contentType && contentType.includes('text/html') && project.js_injections) {
                  return await injectScripts(response, project.js_injections, env);
              }
              
              return response;
          }
      } catch (e) {
          console.error('Middleware Error', e);
      }
  }

  return next();
}

async function handleAdminAuth(context) {
    const { request, env, next } = context;
    const url = new URL(request.url);
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = parseCookies(cookieHeader);
    const token = cookies[ADMIN_COOKIE_NAME];

    const { secret } = await getAdminConfig(env);

    let isAuthenticated = false;
    if (token && await verifyToken(token, secret)) {
        isAuthenticated = true;
    }

    if (!isAuthenticated) {
        if (url.pathname.startsWith('/api/')) return errorResponse('Unauthorized', 401);
        if (url.pathname === '/admin' || url.pathname === '/admin.html') return next();
        return errorResponse('Unauthorized', 401);
    }
    return next();
}

async function checkProjectAuth(context, project) {
    const { request, env } = context;
    const url = new URL(request.url);
    
    const cookieName = `token_${project.id}`;
    const cookieHeader = request.headers.get('Cookie') || '';
    const cookies = parseCookies(cookieHeader);
    
    let token = url.searchParams.get('token');
    let fromUrl = !!token;
    
    if (!token) token = cookies[cookieName];

    const { secret } = await getAdminConfig(env);

    let isValid = false;
    if (token) {
        const payload = await verifyToken(token, secret);
        if (payload && payload.pid === project.id) isValid = true;
    }

    if (!isValid) {
        return Response.redirect(url.origin, 302);
    }

    if (fromUrl) {
        // We return a Redirect to SAME URL but without token? 
        // Or just proceed and set-cookie.
        // If we return Response, we stop the chain. 
        // So we should Redirect to clean URL.
        const cleanUrl = new URL(url);
        cleanUrl.searchParams.delete('token');
        const res = Response.redirect(cleanUrl.toString(), 302);
        res.headers.append('Set-Cookie', `${cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
        return res;
    }
    
    return null; // Auth OK, no redirect needed
}

async function injectScripts(response, jsIdsJson, env) {
    let jsIds = [];
    try { jsIds = JSON.parse(jsIdsJson); } catch (e) {}
    
    if (!jsIds || jsIds.length === 0) return response;
    
    // Fetch JS Content
    // Generating placeholders (?) to bind is annoying with variable length.
    // Loop/Batch fetch or fetch all lib? 
    // Assuming library is small, fetch all is easiest, or loop.
    // Or `SELECT * FROM js_library` and filter in memory.
    const { results } = await env.DB.prepare('SELECT id, content FROM js_library').all();
    const scripts = results.filter(lib => jsIds.includes(lib.id)).map(lib => lib.content).join('\n\n');
    
    if (!scripts) return response;

    return new HTMLRewriter()
        .on('body', {
            append(element) {
                element.append(`<script>${scripts}</script>`, { html: true });
            }
        })
        .transform(response);
}

// --- Helpers ---
function parseCookies(header) {
    return header.split(';').reduce((acc, cookie) => {
      const [name, value] = cookie.trim().split('=');
      if (name) acc[name] = value;
      return acc;
    }, {});
}

async function verifyToken(token, secret) {
    try {
        const [payloadB64, signature] = token.split('.');
        if (!payloadB64 || !signature) return null;
        const expectedSignature = await sign(payloadB64, secret);
        if (signature !== expectedSignature) return null;
        const data = JSON.parse(atob(payloadB64));
        if (data.exp < Date.now()) return null;
        return data;
    } catch (e) { return null; }
}

async function sign(data, secret) {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
    return btoa(String.fromCharCode(...new Uint8Array(signature)));
}
