-- 用户表记录注册 IP；同一 IP 最多注册 3 个账号
ALTER TABLE users ADD COLUMN ip TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS users_ip_idx ON users(ip);
