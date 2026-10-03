-- 交大实验网 初始板块数据（可通过 `npm run db:seed:local` 写入本地 D1）
-- 说明：板块是站点骨架，可按需增删改；id 固定便于引用，重复执行建议先清空 forums 表。

INSERT OR IGNORE INTO forums (id, slug, name, description, icon, sort_order, created_at) VALUES
	('forum-general',  'general',   '综合讨论',   '校园生活、学习日常，畅所欲言',            '💬', 0, (unixepoch() * 1000)),
	('forum-campus',   'campus',    '校园生活',   '校园资讯、社团活动、日常见闻分享',        '🏫', 1, (unixepoch() * 1000)),
	('forum-help',     'help',      '求助问答',   '学习上遇到问题？来这里提问',              '🙋', 2, (unixepoch() * 1000)),
	('forum-share',    'share',     '资料分享',   '课件、笔记、复习资料，互通有无',          '📚', 3, (unixepoch() * 1000)),
	('forum-water',    'water',     '灌水区',     '休闲聊天，欢迎水帖',                      '🌊', 4, (unixepoch() * 1000)),
	('forum-trade',    'trade',     '二手交易',   '二手书、闲置物品转让',                    '🛒', 5, (unixepoch() * 1000));
