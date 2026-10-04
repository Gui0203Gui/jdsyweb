-- 0004: 背包道具 items / 国庆签到 festival_sign_ins / 涂鸦留言板 graffitis

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_items_owner ON items(owner_id);

CREATE TABLE festival_sign_ins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signin_date TEXT NOT NULL,
  item_type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_festival_sign_ins_user_date ON festival_sign_ins(user_id, signin_date);

CREATE TABLE graffitis (
  id TEXT PRIMARY KEY,
  author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_key TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_graffitis_created ON graffitis(created_at);
