// functions/api/admin/files.js
import { jsonResponse, errorResponse, getFileContent, uploadFile, getGitHubFileSha } from '../../utils';

export async function onRequestGet(context) {
    const { env, request } = context;
    const url = new URL(request.url);
    const path = url.searchParams.get('path');
    
    if (!path) return errorResponse('Path required', 400);

    try {
        const content = await getFileContent(env, path);
        if (content === null) return errorResponse('File not found', 404);
        
        return jsonResponse({ content });
    } catch (e) {
        return errorResponse(e.message);
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;
    try {
        const { path, content } = await request.json();
        
        // Get SHA first to allow update
        const sha = await getGitHubFileSha(env, path);
        
        await uploadFile(env, path, content, `Update ${path}`, sha);
        
        return jsonResponse({ success: true });
    } catch (e) {
        return errorResponse(e.message);
    }
}
