name = "project-portal"
compatibility_date = "2024-02-07"

[pages_build]
  preview_command = "npx wrangler pages dev public"
  command = "npm run build"
  output_dir = "public"

# Bind D1 Database
[[d1_databases]]
binding = "DB" # Available in functions as env.DB
database_name = "project-portal-db"
database_id = "YOUR_DATABASE_ID" # User needs to replace this

[vars]
GITHUB_OWNER = "YOUR_GITHUB_USERNAME"
GITHUB_REPO = "YOUR_REPO_NAME"
# GITHUB_TOKEN should be set as a secret, not here.

# Admin Credentials (Set in Environment Variables or Secrets)
# ADMIN_USERNAME = "admin"
# ADMIN_PASSWORD = "your_secure_password"
# OR use Hash for better security
# ADMIN_PASSWORD_HASH = "sha256_hash_of_password"
