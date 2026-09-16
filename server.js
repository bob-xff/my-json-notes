// server.js - 个人小站后端 API（安全加固 + 功能完备版）
const express = require('express');
const fs = require('fs').promises;
const crypto = require('crypto');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件：解析 JSON 请求体（限制大小，防止恶意超大请求）
app.use(express.json({ limit: '1mb' }));

// 静态文件服务（使用绝对路径，避免从其它目录启动时找不到 public）
app.use(express.static(path.join(__dirname, 'public')));

// ========================
// 🗃️ 数据存取（含损坏自愈 + 原子写入）
// ========================

// 检测持久化存储路径（Railway Volume 或其他环境变量）
const DATA_DIR = process.env.DATA_PATH || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// 默认数据（首次运行时自动创建 data.json）
const DEFAULT_DATA = {
    notes: [],
    posts: [],
    siteInfo: {
        siteName: '锋锋の小站',
        siteTagline: '欢迎来到我的个人空间',
        adminEmail: 'admin@example.com'
    },
    carouselImages: {
        image1: 'img/1.jpg',
        image2: 'img/2.jpg',
        image3: 'img/3.jpg',
        image4: 'img/4.jpg'
    },
    quotes: [
        '山高水长，路漫漫其修远兮，吾将上下而求索。',
        '海阔凭鱼跃，天高任鸟飞。',
        '不积跬步，无以至千里；不积小流，无以成江海。',
        '天行健，君子以自强不息；地势坤，君子以厚德载物。',
        '宝剑锋从磨砺出，梅花香自苦寒来。',
        '世上无难事，只怕有心人。'
    ],
    about: {
        text1: '这里是锋锋的小站，一个记录生活、分享想法的个人空间。',
        text2: '喜欢动漫、游戏、编程和一切美好的事物。希望这里能给你带来一些温暖和快乐。',
        text3: '这个网站是我记录生活、分享想法的小天地。希望这里能给你带来一些温暖和快乐。'
    },
    interests: {
        anime: '热爱观看各种类型的动漫，从热血少年到治愈日常，每一部都是心灵的慰藉。',
        game: '享受游戏带来的乐趣，无论是独立游戏还是大作，都能找到属于自己的快乐。',
        coding: '用代码创造有趣的项目，享受解决问题的过程，不断学习新技术。',
        music: '喜欢听各种风格的音乐，音乐是生活中不可或缺的调味剂。'
    },
    contact: {
        intro: '如果你想和我交流，可以通过以下方式联系我：',
        email: '邮箱：contact@example.com',
        github: 'GitHub：github.com/yourname',
        twitter: 'Twitter：@yourname'
    }
};

// 密码哈希工具（scrypt + 随机盐，不再明文存储密码）
function hashPassword(password, salt) {
    const useSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(String(password), useSalt, 64).toString('hex');
    return { salt: useSalt, hash };
}

function verifyPassword(password, admin) {
    if (!admin || !admin.salt || !admin.hash) return false;
    const { hash } = hashPassword(password, admin.salt);
    // 使用 timingSafeEqual 防止时序攻击
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(admin.hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// 初始化管理员凭据：优先使用环境变量（便于部署时自定义），否则使用默认值
function buildAdminCredentials() {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD || 'admin123';
    const { salt, hash } = hashPassword(password);
    return { username, salt, hash };
}

// 工具函数：原子写入（先写临时文件再重命名，避免写入中断导致数据文件损坏）
async function writeData(data) {
    const tmpPath = DATA_FILE + '.tmp';
    await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    await fs.rename(tmpPath, DATA_FILE);
}

// 工具函数：读取 data.json（不存在时自动创建；损坏时自动备份并重建，避免全站 500）
async function readData() {
    try {
        const data = await fs.readFile(DATA_FILE, 'utf8');
        const parsed = JSON.parse(data);
        // 兼容旧版数据文件：补齐 admin 凭据字段
        if (!parsed.admin || !parsed.admin.hash) {
            parsed.admin = buildAdminCredentials();
            await writeData(parsed).catch(() => {});
        }
        return parsed;
    } catch (err) {
        if (err.code === 'ENOENT') {
            const initial = { ...DEFAULT_DATA, admin: buildAdminCredentials() };
            await writeData(initial);
            return initial;
        }
        if (err instanceof SyntaxError) {
            // 数据文件损坏：备份原文件后重建，保证网站可用
            const backupPath = DATA_FILE + '.corrupted-' + Date.now();
            await fs.rename(DATA_FILE, backupPath).catch(() => {});
            console.error(`⚠️ data.json 已损坏，原文件备份至 ${backupPath}，已重建默认数据`);
            const initial = { ...DEFAULT_DATA, admin: buildAdminCredentials() };
            await writeData(initial);
            return initial;
        }
        throw err;
    }
}

// ========================
// 🔐 登录认证 (Auth)
// ========================

// 会话令牌存储（内存态，重启后需重新登录；TTL 24 小时）
const SESSION_TTL = 24 * 60 * 60 * 1000;
const activeTokens = new Map();

// 登录防爆破：同一 IP 15 分钟内最多失败 8 次
const LOGIN_WINDOW = 15 * 60 * 1000;
const LOGIN_MAX_FAILS = 8;
const loginFailures = new Map();

function isLoginBlocked(ip) {
    const record = loginFailures.get(ip);
    if (!record) return false;
    if (Date.now() > record.resetAt) {
        loginFailures.delete(ip);
        return false;
    }
    return record.count >= LOGIN_MAX_FAILS;
}

function recordLoginFailure(ip) {
    const record = loginFailures.get(ip);
    if (!record || Date.now() > record.resetAt) {
        loginFailures.set(ip, { count: 1, resetAt: Date.now() + LOGIN_WINDOW });
    } else {
        record.count += 1;
    }
}

function clearLoginFailures(ip) {
    loginFailures.delete(ip);
}

// 生成随机令牌
function createToken() {
    const token = crypto.randomBytes(32).toString('hex');
    activeTokens.set(token, Date.now() + SESSION_TTL);
    return token;
}

// 鉴权中间件：校验 Authorization: Bearer <token> 或 x-admin-token
function requireAuth(req, res, next) {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-admin-token'];
    if (!token || !activeTokens.has(token)) {
        return res.status(401).json({ success: false, message: '未登录或登录已过期，请重新登录' });
    }
    const expiresAt = activeTokens.get(token);
    if (Date.now() > expiresAt) {
        activeTokens.delete(token);
        return res.status(401).json({ success: false, message: '登录已过期，请重新登录' });
    }
    next();
}

// 定期清理过期令牌
setInterval(() => {
    const now = Date.now();
    for (const [token, expiresAt] of activeTokens) {
        if (now > expiresAt) activeTokens.delete(token);
    }
}, 60 * 60 * 1000).unref();

// POST /api/login - 管理员登录（返回会话令牌）
app.post('/api/login', async (req, res) => {
    try {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        if (isLoginBlocked(ip)) {
            return res.status(429).json({ success: false, message: '失败次数过多，请 15 分钟后再试' });
        }
        const { username, password } = req.body || {};
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '请输入用户名和密码' });
        }
        const data = await readData();
        const admin = data.admin || buildAdminCredentials();
        if (username === admin.username && verifyPassword(password, admin)) {
            clearLoginFailures(ip);
            return res.json({ success: true, message: '登录成功', token: createToken() });
        }
        recordLoginFailure(ip);
        return res.status(401).json({ success: false, message: '用户名或密码错误' });
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// POST /api/logout - 退出登录（吊销令牌）
app.post('/api/logout', requireAuth, (req, res) => {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-admin-token'];
    if (token) activeTokens.delete(token);
    res.json({ success: true, message: '已退出登录' });
});

// POST /api/change-password - 修改密码（持久化到 data.json，重启不失效）
app.post('/api/change-password', requireAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: '请填写完整信息' });
        }
        if (String(newPassword).length < 4) {
            return res.status(400).json({ success: false, message: '新密码长度不能少于4位' });
        }
        const data = await readData();
        const admin = data.admin || buildAdminCredentials();
        if (!verifyPassword(currentPassword, admin)) {
            // 403 表示"已登录但当前密码错误"，与 401（令牌失效）区分开
            return res.status(403).json({ success: false, message: '当前密码错误' });
        }
        const { salt, hash } = hashPassword(newPassword);
        data.admin = { ...admin, salt, hash };
        await writeData(data);
        res.json({ success: true, message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// POST /api/reset-settings - 重置所有设置（保留管理员凭据）
app.post('/api/reset-settings', requireAuth, async (req, res) => {
    try {
        const data = await readData();
        const resetData = { ...DEFAULT_DATA, admin: data.admin };
        await writeData(resetData);
        res.json({ success: true, message: '设置已重置' });
    } catch (error) {
        console.error('重置设置失败:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// GET /api/health - 健康检查（部署平台探活用）
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// ========================
// 📝 笔记 (Notes) API
// ========================

app.get('/api/notes', async (req, res) => {
    try {
        const data = await readData();
        const sortedNotes = [...(data.notes || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(sortedNotes);
    } catch (error) {
        console.error('获取笔记失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.post('/api/notes', requireAuth, async (req, res) => {
    try {
        const { title, content } = req.body || {};
        if (!title || !content) {
            return res.status(400).json({ message: '标题和内容不能为空' });
        }
        const data = await readData();
        data.notes = data.notes || [];
        const newId = data.notes.length > 0 ? Math.max(...data.notes.map(n => Number(n.id) || 0)) + 1 : 1;
        const newNote = { id: newId, title, content, createdAt: new Date().toISOString() };
        data.notes.push(newNote);
        await writeData(data);
        res.status(201).json(newNote);
    } catch (error) {
        console.error('创建笔记失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.delete('/api/notes/:id', requireAuth, async (req, res) => {
    try {
        const noteId = parseInt(req.params.id, 10);
        const data = await readData();
        data.notes = data.notes || [];
        const index = data.notes.findIndex(note => note.id === noteId);
        if (index === -1) {
            return res.status(404).json({ message: '笔记未找到' });
        }
        data.notes.splice(index, 1);
        await writeData(data);
        res.status(204).send();
    } catch (error) {
        console.error('删除笔记失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// ========================
// 📰 博客文章 (Posts) API
// ========================

app.get('/api/posts', async (req, res) => {
    try {
        const data = await readData();
        const sortedPosts = [...(data.posts || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
        res.json(sortedPosts);
    } catch (error) {
        console.error('获取文章失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.get('/api/posts/:id', async (req, res) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const data = await readData();
        const post = (data.posts || []).find(p => p.id === postId);
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        res.json(post);
    } catch (error) {
        console.error('获取单篇文章失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.post('/api/posts', requireAuth, async (req, res) => {
    try {
        const { title, content, category, tags, date } = req.body || {};
        if (!title || !content) {
            return res.status(400).json({ message: '标题和内容不能为空' });
        }
        const data = await readData();
        data.posts = data.posts || [];
        const newId = data.posts.length > 0 ? Math.max(...data.posts.map(p => Number(p.id) || 0)) + 1 : 1;
        const contentText = String(content);
        const newPost = {
            id: newId,
            title,
            content: contentText,
            category: category || '日记',
            tags: Array.isArray(tags) ? tags : [],
            date: date || new Date().toISOString().split('T')[0],
            views: 0,
            likes: 0,
            comments: 0,
            excerpt: contentText.substring(0, 100) + '...'
        };
        data.posts.push(newPost);
        await writeData(data);
        res.status(201).json(newPost);
    } catch (error) {
        console.error('创建文章失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// PUT /api/posts/:id - 编辑文章（此前编辑流程断裂，现补全服务端支持）
app.put('/api/posts/:id', requireAuth, async (req, res) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const { title, content, category, tags, date } = req.body || {};
        const data = await readData();
        data.posts = data.posts || [];
        const post = data.posts.find(p => p.id === postId);
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        if (title !== undefined) post.title = title;
        if (content !== undefined) {
            post.content = String(content);
            post.excerpt = post.content.substring(0, 100) + '...';
        }
        if (category !== undefined) post.category = category;
        if (tags !== undefined) post.tags = Array.isArray(tags) ? tags : [];
        if (date !== undefined) post.date = date;
        await writeData(data);
        res.json(post);
    } catch (error) {
        console.error('更新文章失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// POST /api/posts/:id/view - 浏览量 +1（公开接口，访客阅读即计数）
app.post('/api/posts/:id/view', async (req, res) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const data = await readData();
        const post = (data.posts || []).find(p => p.id === postId);
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        post.views = (Number(post.views) || 0) + 1;
        await writeData(data);
        res.json({ views: post.views });
    } catch (error) {
        console.error('记录浏览量失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// POST /api/posts/:id/like - 点赞 +1（公开接口）
app.post('/api/posts/:id/like', async (req, res) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const data = await readData();
        const post = (data.posts || []).find(p => p.id === postId);
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        post.likes = (Number(post.likes) || 0) + 1;
        await writeData(data);
        res.json({ likes: post.likes });
    } catch (error) {
        console.error('点赞失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.delete('/api/posts/:id', requireAuth, async (req, res) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const data = await readData();
        data.posts = data.posts || [];
        const index = data.posts.findIndex(post => post.id === postId);
        if (index === -1) {
            return res.status(404).json({ message: '文章未找到' });
        }
        data.posts.splice(index, 1);
        await writeData(data);
        res.status(204).send();
    } catch (error) {
        console.error('删除文章失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// ========================
// ⚙️ 网站信息 (Site Info) API
// ========================

app.get('/api/site-info', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.siteInfo || {});
    } catch (error) {
        console.error('获取网站信息失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.put('/api/site-info', requireAuth, async (req, res) => {
    try {
        const newInfo = req.body || {};
        const data = await readData();
        data.siteInfo = { ...(data.siteInfo || {}), ...newInfo };
        await writeData(data);
        res.json(data.siteInfo);
    } catch (error) {
        console.error('更新网站信息失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// ========================
// 📜 激励语录 (Quotes) API
// ========================

app.get('/api/quotes', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.quotes || []);
    } catch (error) {
        console.error('获取激励语录失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.put('/api/quotes', requireAuth, async (req, res) => {
    try {
        const quotes = req.body;
        if (!Array.isArray(quotes)) {
            return res.status(400).json({ message: '数据格式错误' });
        }
        const data = await readData();
        data.quotes = quotes;
        await writeData(data);
        res.json(data.quotes);
    } catch (error) {
        console.error('保存激励语录失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// ========================
// 📄 关于页面内容 (About) API
// ========================

app.get('/api/about', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.about || {});
    } catch (error) {
        console.error('获取关于内容失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.put('/api/about', requireAuth, async (req, res) => {
    try {
        const newAbout = req.body || {};
        const data = await readData();
        data.about = { ...(data.about || {}), ...newAbout };
        await writeData(data);
        res.json(data.about);
    } catch (error) {
        console.error('保存关于内容失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// ========================
// 🎯 兴趣爱好 (Interests) API
// ========================

app.get('/api/interests', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.interests || {});
    } catch (error) {
        console.error('获取兴趣爱好失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.put('/api/interests', requireAuth, async (req, res) => {
    try {
        const newInterests = req.body || {};
        const data = await readData();
        data.interests = { ...(data.interests || {}), ...newInterests };
        await writeData(data);
        res.json(data.interests);
    } catch (error) {
        console.error('保存兴趣爱好失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// ========================
// 📬 联系方式 (Contact) API
// ========================

app.get('/api/contact', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.contact || {});
    } catch (error) {
        console.error('获取联系方式失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.put('/api/contact', requireAuth, async (req, res) => {
    try {
        const newContact = req.body || {};
        const data = await readData();
        data.contact = { ...(data.contact || {}), ...newContact };
        await writeData(data);
        res.json(data.contact);
    } catch (error) {
        console.error('保存联系方式失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// ========================
// 🖼️ 轮播图 (Carousel Images) API
// ========================

app.get('/api/carousel-images', async (req, res) => {
    try {
        const data = await readData();
        res.json(data.carouselImages || {});
    } catch (error) {
        console.error('获取轮播图失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.put('/api/carousel-images', requireAuth, async (req, res) => {
    try {
        const newImages = req.body || {};
        const data = await readData();
        data.carouselImages = { ...(data.carouselImages || {}), ...newImages };
        await writeData(data);
        res.json(data.carouselImages);
    } catch (error) {
        console.error('保存轮播图失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// ========================
// 🚧 404 与错误兜底
// ========================

app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ message: '接口不存在' });
    }
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

app.use((err, req, res, next) => {
    console.error('未处理的错误:', err);
    if (res.headersSent) return next(err);
    if (req.path.startsWith('/api/')) {
        return res.status(500).json({ message: '服务器内部错误' });
    }
    res.status(500).send('服务器内部错误');
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
    console.log(`📁 数据文件路径: ${DATA_FILE}`);
    if (!process.env.ADMIN_PASSWORD) {
        console.log('🔑 提示：当前使用默认管理员账号 admin / admin123，建议通过环境变量 ADMIN_USERNAME / ADMIN_PASSWORD 覆盖，并在登录后修改密码');
    }
});
