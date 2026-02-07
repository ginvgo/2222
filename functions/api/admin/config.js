// functions/api/admin/config.js
import { jsonResponse, errorResponse } from '../../utils';

export async function onRequestGet(context) {
    const { env } = context;
    try {
        const { results } = await env.DB.prepare('SELECT * FROM config').all();
        const config = results.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        return jsonResponse(config);
    } catch (e) {
        return errorResponse(e.message);
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const updates = await request.json();
        // updates is object { key: value }
        
        const stmt = env.DB.prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)');
        const batch = [];
        
        for (const [key, value] of Object.entries(updates)) {
            batch.push(stmt.bind(key, String(value)));
        }
        
        await env.DB.batch(batch);
        
        return jsonResponse({ success: true });
    } catch (e) {
        return errorResponse(e.message);
    }
}
