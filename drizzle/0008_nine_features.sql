-- 九功能数据层：投票帖 / 关注 / 私信 / 成就 / 举报 / 公告
-- 用户选定的方案：A3 B1 B2 B3 C1 C3 D1 D2 D4（B1等级/D4深色/B2打赏/B3成就无需新表的部分在代码层实现）

-- ========== A3 投票帖：posts 增加投票选项（JSON），独立投票表 ==========
ALTER TABLE posts ADD COLUMN poll_options TEXT; -- JSON 数组 ["选项A","选项B"]；NULL=普通帖

CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,          -- 选项序号字符串（"0"、"1"...），与 poll_options 数组下标对应
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (post_id, user_id)
);
CREATE INDEX IF NOT EXISTS poll_votes_post_idx ON poll_votes(post_id);
CREATE INDEX IF NOT EXISTS poll_votes_user_idx ON poll_votes(user_id);

-- ========== C1 关注 ==========
CREATE TABLE IF NOT EXISTS follows (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS follows_follower_idx ON follows(follower_id);
CREATE INDEX IF NOT EXISTS follows_following_idx ON follows(following_id);

-- ========== C1 私信 ==========
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS messages_receiver_idx ON messages(receiver_id, created_at);
CREATE INDEX IF NOT EXISTS messages_sender_idx ON messages(sender_id, created_at);

-- ========== B3 成就 ==========
CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆'
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON user_achievements(user_id);

-- 成就种子
INSERT OR IGNORE INTO achievements (id, key, name, description, icon) VALUES
  ('ach-first-post',      'first-post',       '初来乍到',     '发布第一个帖子',                '📝'),
  ('ach-first-comment',   'first-comment',    '妙语连珠',     '发表第一条评论',                '💬'),
  ('ach-signin-7',        'signin-7',         '七日之约',     '累计签到 7 天',                 '📅'),
  ('ach-like-100',        'like-100',         '人气爆棚',     '累计收到 100 个赞',             '❤️'),
  ('ach-work-first',      'work-first',       '作品初成',     '上传第一个作品',                '🎨'),
  ('ach-badge-owner',     'badge-owner',      '名号加身',     '拥有一个称号',                  '🏅'),
  ('ach-flower-collector','flower-collector', '花语集者',     '集齐虞美人、矢车菊、蒲公英',    '🌼'),
  ('ach-point-500',       'point-500',        '积分达人',     '积分达到 500',                  '⭐'),
  ('ach-follow-10',       'follow-10',        '广交好友',     '关注 10 位吧友',                '🤝'),
  ('ach-message-first',   'message-first',    '鸿雁传书',     '收到第一条私信',                '💌');

-- ========== D1 举报 ==========
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,        -- post / comment
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending / resolved / dismissed
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status, created_at);

-- ========== D2 公告 ==========
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS announcements_active_idx ON announcements(is_active, created_at);
