// functions/utils.js

export const GITHUB_API_BASE = 'https://api.github.com';

export async function githubRequest(env, endpoint, method = 'GET', body = null) {
  const headers = {
    'Authorization': `Bearer ${env.GITHUB_TOKEN}`,
    'User-Agent': 'Cloudflare-Pages-Function',
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.github.v3+json',
  };

  const url = `${GITHUB_API_BASE}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}${endpoint}`;
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API Error: ${response.status} ${response.statusText} - ${errorText}`);
  }
  return response.json();
}

export async function getFileContent(env, path) {
  try {
    const data = await githubRequest(env, `/contents/${path}`);
    // Content is base64 encoded
    if (data.content && data.encoding === 'base64') {
        // In Cloudflare Workers, atob is available
        const binaryString = atob(data.content.replace(/\n/g, ''));
        // Handle UTF-8 characters correctly
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return new TextDecoder('utf-8').decode(bytes);
    }
    return null;
  } catch (e) {
    if (e.message.includes('404')) return null;
    throw e;
  }
}

export async function uploadFile(env, path, content, message, sha = null) {
  // Convert content to Base64
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  let binaryString = '';
  for (let i = 0; i < data.length; i++) {
    binaryString += String.fromCharCode(data[i]);
  }
  const base64Content = btoa(binaryString);

  const body = {
    message: message,
    content: base64Content,
  };
  if (sha) {
    body.sha = sha;
  }

  return githubRequest(env, `/contents/${path}`, 'PUT', body);
}

export async function getGitHubFileSha(env, path) {
    try {
        const data = await githubRequest(env, `/contents/${path}`);
        return data.sha;
    } catch (e) {
        return null;
    }
}

// Simple Response Helpers
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function errorResponse(message, status = 500) {
  return jsonResponse({ error: message }, status);
}

// Password Hashing (Simple SHA-256 for this demo, usually use bcrypt/Argon2 but strict CF limits might apply, Web Crypto is safe)
export async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function getAdminConfig(env) {
    const username = env.ADMIN_USERNAME || 'admin';
    let passwordHash = env.ADMIN_PASSWORD_HASH;
    let secret = env.ADMIN_PASSWORD_HASH;

    if (!passwordHash) {
        if (env.ADMIN_PASSWORD) {
            passwordHash = await hashPassword(env.ADMIN_PASSWORD);
            // Use the hash of the password as secret too, to be consistent and safer than plaintext
            secret = passwordHash; 
        } else {
            passwordHash = await hashPassword('password');
            secret = 'default_secret';
        }
    }
    
    return { username, passwordHash, secret: secret || 'default_secret' };
}
