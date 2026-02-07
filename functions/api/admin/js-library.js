// functions/api/admin/js-library.js
import { jsonResponse, errorResponse } from '../../utils';

export async function onRequestGet(context) {
    const { env } = context;
    try {
        const { results } = await env.DB.prepare('SELECT * FROM js_library ORDER BY created_at DESC').all();
        return jsonResponse(results);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const { id, name, content } = await request.json();
        const now = Date.now();
        const finalId = id || crypto.randomUUID();
        
        await env.DB.prepare(`
            INSERT INTO js_library (id, name, content, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?4)
            ON CONFLICT(id) DO UPDATE SET
            name = ?2, content = ?3, updated_at = ?4
        `).bind(finalId, name, content, now).run();

        return jsonResponse({ success: true, id: finalId });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export async function onRequestDelete(context) {
    const { request, env } = context;
    try {
        const { id } = await request.json();
        await env.DB.prepare('DELETE FROM js_library WHERE id = ?').bind(id).run();
        return jsonResponse({ success: true });
    } catch (e) {
        return errorResponse(e.message);
    }
}
