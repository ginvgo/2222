// functions/api/public/verify.js
import { jsonResponse, errorResponse, getAdminConfig } from '../../utils';

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const { projectId, password } = await request.json();
        
        const project = await env.DB.prepare('SELECT passwords, remember_duration FROM projects WHERE id = ?').bind(projectId).first();
        
        if (!project) return errorResponse('Project not found', 404);
        
        const passwords = JSON.parse(project.passwords || '[]');
        if (passwords.includes(password)) {
            // Generate Access Token for this project
            const duration = (project.remember_duration || 30) * 24 * 60 * 60 * 1000;
            const exp = Date.now() + duration;
            const payload = JSON.stringify({ pid: projectId, exp });
            
            const { secret } = await getAdminConfig(env);
            
            // Sign it
            const signature = await sign(payload, secret);
            const token = `${btoa(payload)}.${signature}`;
            
            return jsonResponse({ success: true, token });
        }
        
        return errorResponse('Invalid password', 401);
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
