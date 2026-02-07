// functions/api/public/list.js
import { jsonResponse, errorResponse } from '../../utils';

export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const search = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    
    // Get config for items per page
    let limit = 12;
    try {
        const config = await env.DB.prepare("SELECT value FROM config WHERE key = 'items_per_page'").first();
        if (config) limit = parseInt(config.value);
    } catch (e) {}
    
    const offset = (page - 1) * limit;

    try {
        let query = 'SELECT * FROM projects WHERE is_public = 1';
        let params = [];
        
        if (search) {
            query += ' AND (name LIKE ? OR folder_path LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        
        // Count total
        // Note: D1 doesn't support easy count with limit in one go, need separate query
        // Or fetch all and filter (for small datasets this is fine)
        // For scalability, count first.
        
        // Construct Count Query
        let countQuery = 'SELECT COUNT(*) as total FROM projects WHERE is_public = 1';
        if (search) {
            countQuery += ' AND (name LIKE ? OR folder_path LIKE ?)';
        }
        const { total } = await env.DB.prepare(countQuery).bind(...params).first();
        
        // Fetch Data
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(limit, offset);
        
        const { results } = await env.DB.prepare(query).bind(...params).all();

        // Sanitize results (remove passwords)
        const safeResults = results.map(p => {
            const { passwords, ...rest } = p;
            return rest;
        });

        return jsonResponse({
            data: safeResults,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });

    } catch (e) {
        return errorResponse(e.message);
    }
}
