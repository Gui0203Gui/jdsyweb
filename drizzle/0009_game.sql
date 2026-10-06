-- 游戏模块数据层（轻量协作建造《交大工坊》）
-- 地图 / 格子建筑 / 玩家资源 / 地图聊天 / 每日兑换防刷

CREATE TABLE IF NOT EXISTS game_maps (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE TABLE IF NOT EXISTS game_tiles (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES game_maps(id) ON DELETE CASCADE,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  type TEXT NOT NULL,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  UNIQUE (map_id, x, y)
);
CREATE INDEX IF NOT EXISTS idx_game_tiles_map ON game_tiles(map_id);

CREATE TABLE IF NOT EXISTS game_resources (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  map_id TEXT NOT NULL REFERENCES game_maps(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, map_id, resource_type)
);

CREATE TABLE IF NOT EXISTS game_chat (
  id TEXT PRIMARY KEY,
  map_id TEXT NOT NULL REFERENCES game_maps(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX IF NOT EXISTS idx_game_chat_map ON game_chat(map_id, created_at);

CREATE TABLE IF NOT EXISTS game_exchanges (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);
