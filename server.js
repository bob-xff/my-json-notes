// server.js - 完整版后端 API
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件：解析 JSON 请求体
app.use(express.json());

// 静态文件服务（HTML, CSS, JS, 图片等）
app.use(express.static('public'));

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

// 工具函数：读取 data.json（不存在时自动创建）
async function readData() {
    const dataPath = path.join(__dirname, 'data.json');
    try {
        const data = await fs.readFile(dataPath, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        if (err.code === 'ENOENT') {
            await writeData(DEFAULT_DATA);
            return DEFAULT_DATA;
        }
        throw err;
    }
}

// 工具函数：写入 data.json
async function writeData(data) {
    const dataPath = path.join(__dirname, 'data.json');
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2), 'utf8');
}

// ========================
// 🔐 登录认证 (Auth) API
// ========================

const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
};

// POST /api/login - 管理员登录
app.post('/api/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, message: '请输入用户名和密码' });
        }
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            return res.json({ success: true, message: '登录成功' });
        } else {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }
    } catch (error) {
        console.error('登录失败:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// POST /api/change-password - 修改密码
app.post('/api/change-password', (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: '请填写完整信息' });
        }
        if (currentPassword !== ADMIN_CREDENTIALS.password) {
            return res.status(401).json({ success: false, message: '当前密码错误' });
        }
        ADMIN_CREDENTIALS.password = newPassword;
        res.json({ success: true, message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// POST /api/reset-settings - 重置所有设置
app.post('/api/reset-settings', async (req, res) => {
    try {
        const defaultData = {
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
        await writeData(defaultData);
        res.json({ success: true, message: '设置已重置' });
    } catch (error) {
        console.error('重置设置失败:', error);
        res.status(500).json({ success: false, message: '服务器内部错误' });
    }
});

// ========================
// 📝 笔记 (Notes) API
// ========================

app.get('/api/notes', async (req, res) => {
    try {
        const data = await readData();
        const sortedNotes = data.notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(sortedNotes);
    } catch (error) {
        console.error('获取笔记失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.post('/api/notes', async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: '标题和内容不能为空' });
        }
        const data = await readData();
        const newId = data.notes.length > 0 ? Math.max(...data.notes.map(n => n.id)) + 1 : 1;
        const newNote = { id: newId, title, content, createdAt: new Date().toISOString() };
        data.notes.push(newNote);
        await writeData(data);
        res.status(201).json(newNote);
    } catch (error) {
        console.error('创建笔记失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.delete('/api/notes/:id', async (req, res) => {
    try {
        const noteId = parseInt(req.params.id, 10);
        const data = await readData();
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
        const sortedPosts = data.posts.sort((a, b) => new Date(b.date) - new Date(a.date));
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
        const post = data.posts.find(p => p.id === postId);
        if (!post) {
            return res.status(404).json({ message: '文章未找到' });
        }
        res.json(post);
    } catch (error) {
        console.error('获取单篇文章失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.post('/api/posts', async (req, res) => {
    try {
        const { title, content, category, tags, date } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: '标题和内容不能为空' });
        }
        const data = await readData();
        const newId = data.posts.length > 0 ? Math.max(...data.posts.map(p => p.id)) + 1 : 1;
        const newPost = {
            id: newId,
            title,
            content,
            category: category || '日记',
            tags: Array.isArray(tags) ? tags : [],
            date: date || new Date().toISOString().split('T')[0],
            views: 0,
            likes: 0,
            comments: 0,
            excerpt: content.substring(0, 100) + '...'
        };
        data.posts.push(newPost);
        await writeData(data);
        res.status(201).json(newPost);
    } catch (error) {
        console.error('创建文章失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.delete('/api/posts/:id', async (req, res) => {
    try {
        const postId = parseInt(req.params.id, 10);
        const data = await readData();
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
        res.json(data.siteInfo);
    } catch (error) {
        console.error('获取网站信息失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.post('/api/site-info', async (req, res) => {
    try {
        const newInfo = req.body;
        const data = await readData();
        data.siteInfo = { ...data.siteInfo, ...newInfo };
        await writeData(data);
        res.json(data.siteInfo);
    } catch (error) {
        console.error('更新网站信息失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

app.put('/api/site-info', async (req, res) => {
    try {
        const newInfo = req.body;
        const data = await readData();
        data.siteInfo = { ...data.siteInfo, ...newInfo };
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

app.put('/api/quotes', async (req, res) => {
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

app.put('/api/about', async (req, res) => {
    try {
        const newAbout = req.body;
        const data = await readData();
        data.about = { ...data.about, ...newAbout };
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

app.put('/api/interests', async (req, res) => {
    try {
        const newInterests = req.body;
        const data = await readData();
        data.interests = { ...data.interests, ...newInterests };
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

app.put('/api/contact', async (req, res) => {
    try {
        const newContact = req.body;
        const data = await readData();
        data.contact = { ...data.contact, ...newContact };
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

app.put('/api/carousel-images', async (req, res) => {
    try {
        const newImages = req.body;
        const data = await readData();
        data.carouselImages = { ...data.carouselImages, ...newImages };
        await writeData(data);
        res.json(data.carouselImages);
    } catch (error) {
        console.error('保存轮播图失败:', error);
        res.status(500).json({ message: '服务器内部错误' });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`✅ 服务器运行在 http://localhost:${PORT}`);
});
