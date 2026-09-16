// ============================================================
// main.js - 前端主脚本（Bug 修复 + 功能完善 + 动效升级）
// ============================================================

// ---------- 通用工具 ----------

// HTML 转义：所有动态内容渲染前必须经过它，杜绝 XSS
function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 是否偏好减少动效（无障碍适配）
const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// 认证守卫：检查是否已登录，未登录则跳转到登录页
function checkAuth() {
    if (sessionStorage.getItem('isLoggedIn') !== 'true' || !sessionStorage.getItem('adminToken')) {
        sessionStorage.clear();
        window.location.href = 'admin.html';
        return false;
    }
    return true;
}

function logout() {
    if (!confirm('确定要退出登录吗？')) return;
    const token = sessionStorage.getItem('adminToken');
    // 尽力吊销服务端令牌，失败不阻塞退出
    if (token) {
        fetch('/api/logout', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        }).catch(() => {});
    }
    sessionStorage.clear();
    window.location.href = 'admin.html';
}

// ---------- Toast 通知（替代 alert，带动画） ----------
function showToast(message, type = 'info', duration = 3200) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fas ${icons[type] || icons.info}"></i>
        <span class="toast-message">${escapeHtml(message)}</span>
        <span class="toast-progress" style="animation-duration:${duration}ms"></span>
    `;
    container.appendChild(toast);
    // 触发入场动画
    requestAnimationFrame(() => toast.classList.add('show'));
    const dismiss = () => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => toast.remove(), 350);
    };
    toast.addEventListener('click', dismiss);
    setTimeout(dismiss, duration);
}

// ---------- 通用 API 请求（自动携带令牌 / 处理过期） ----------
async function apiRequest(url, options = {}) {
    const token = sessionStorage.getItem('adminToken');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };
    try {
        const response = await fetch(url, { ...options, headers });

        // 令牌失效：清空会话并跳转登录页
        if (response.status === 401 && !url.includes('/api/login')) {
            sessionStorage.clear();
            showToast('登录已过期，请重新登录', 'error');
            setTimeout(() => { window.location.href = 'admin.html'; }, 800);
            throw new Error('登录已过期');
        }

        if (!response.ok) {
            let message = `请求失败（${response.status}）`;
            try {
                const body = await response.json();
                if (body && body.message) message = body.message;
            } catch (_) { /* 忽略解析失败 */ }
            throw new Error(message);
        }

        if (response.status === 204) return null;
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        throw error;
    }
}

// ---------- 阅读弹窗（文章详情，替代 alert） ----------
let modalState = { likedIds: [] };

function getLikedIds() {
    try { return JSON.parse(localStorage.getItem('likedPosts') || '[]'); } catch (_) { return []; }
}

function openPostModal(post, { countView = true } = {}) {
    // 移除已存在的弹窗
    closePostModal(true);

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'postModal';
    overlay.innerHTML = `
        <div class="modal-card" role="dialog" aria-modal="true">
            <button class="modal-close" aria-label="关闭"><i class="fas fa-xmark"></i></button>
            <div class="modal-meta">
                <span><i class="fas fa-calendar"></i> ${escapeHtml(post.date || '')}</span>
                <span><i class="fas fa-folder"></i> ${escapeHtml(post.category || '日记')}</span>
                <span><i class="fas fa-eye"></i> <span class="modal-views">${Number(post.views) || 0}</span></span>
            </div>
            <h2 class="modal-title">${escapeHtml(post.title || '')}</h2>
            <div class="modal-tags">
                ${(post.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="modal-content"></div>
            <div class="modal-comments">
                <h3 class="comments-title">
                    <i class="fas fa-comments"></i> 评论 (<span class="comment-count">0</span>)
                </h3>
                <div class="comment-list"><p class="comments-empty">评论加载中...</p></div>
                <form class="comment-form">
                    <input type="text" class="form-input comment-nickname" placeholder="昵称（选填，默认显示“游客）”" maxlength="20">
                    <textarea class="form-input comment-content" rows="2" placeholder="写下你的评论吧..." maxlength="500" required></textarea>
                    <div class="comment-form-actions">
                        <button type="submit" class="btn btn-primary comment-submit">
                            <i class="fas fa-paper-plane"></i> 发表评论
                        </button>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="like-btn ${modalState.likedIds.includes(post.id) ? 'liked' : ''}" data-post-id="${post.id}">
                    <i class="fas fa-heart"></i>
                    <span>点赞</span>
                    <span class="like-count">${Number(post.likes) || 0}</span>
                </button>
            </div>
        </div>
    `;
    // 用 textContent 渲染正文（保留换行），天然防注入
    overlay.querySelector('.modal-content').textContent = post.content || '';
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    requestAnimationFrame(() => overlay.classList.add('open'));

    const close = () => closePostModal();
    overlay.querySelector('.modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', modalEscHandler);

    if (countView) {
        // 浏览量 +1（静默失败不影响阅读）
        apiRequest(`/api/posts/${post.id}/view`, { method: 'POST' })
            .then(res => {
                const viewsEl = overlay.querySelector('.modal-views');
                if (viewsEl && res && res.views !== undefined) viewsEl.textContent = res.views;
            })
            .catch(() => {});
    }

    overlay.querySelector('.like-btn').addEventListener('click', (e) => handleLike(e.currentTarget, post.id));

    // ---- 评论区 ----
    const nicknameInput = overlay.querySelector('.comment-nickname');
    const savedNickname = localStorage.getItem('commentNickname');
    if (savedNickname) nicknameInput.value = savedNickname;

    overlay.querySelector('.comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const contentInput = overlay.querySelector('.comment-content');
        const content = contentInput.value.trim();
        const nickname = nicknameInput.value.trim();
        if (!content) {
            showToast('评论内容不能为空', 'error');
            return;
        }
        const submitBtn = overlay.querySelector('.comment-submit');
        submitBtn.disabled = true;
        try {
            await apiRequest(`/api/posts/${post.id}/comments`, {
                method: 'POST',
                body: JSON.stringify({ nickname, content })
            });
            if (nickname) localStorage.setItem('commentNickname', nickname);
            contentInput.value = '';
            showToast('评论发表成功！', 'success');
            renderModalComments(overlay, post.id);
        } catch (error) {
            showToast(error.message || '评论失败', 'error');
        } finally {
            submitBtn.disabled = false;
        }
    });

    renderModalComments(overlay, post.id);
}

// 渲染弹窗内的评论列表
async function renderModalComments(overlay, postId) {
    const listEl = overlay.querySelector('.comment-list');
    const countEl = overlay.querySelector('.comment-count');
    if (!listEl) return;
    try {
        const comments = await apiRequest(`/api/posts/${postId}/comments`);
        listEl.innerHTML = '';
        if (countEl) countEl.textContent = comments.length;
        // 同步动态页卡片上的评论数
        document.querySelectorAll(`.blog-item[data-post-id="${postId}"] .meta-comments`).forEach(el => {
            el.innerHTML = `<i class="fas fa-comment"></i> ${comments.length}`;
        });

        if (comments.length === 0) {
            listEl.innerHTML = '<p class="comments-empty">还没有评论，来抢沙发吧～</p>';
            return;
        }

        const isAdmin = !!sessionStorage.getItem('adminToken');
        comments.forEach((comment, i) => {
            const item = document.createElement('div');
            item.className = 'comment-item';
            item.style.setProperty('--i', i);
            const initial = (comment.nickname || '游').trim().charAt(0).toUpperCase() || '游';
            item.innerHTML = `
                <span class="comment-avatar">${escapeHtml(initial)}</span>
                <div class="comment-body">
                    <div class="comment-header">
                        <span class="comment-nickname">${escapeHtml(comment.nickname || '游客')}</span>
                        <span class="comment-time">${escapeHtml(formatCommentTime(comment.createdAt))}</span>
                        ${isAdmin ? '<button class="comment-delete" title="删除评论"><i class="fas fa-trash"></i></button>' : ''}
                    </div>
                    <p class="comment-text">${escapeHtml(comment.content)}</p>
                </div>
            `;
            if (isAdmin) {
                item.querySelector('.comment-delete').addEventListener('click', async () => {
                    if (!confirm('确定要删除这条评论吗？')) return;
                    try {
                        await apiRequest(`/api/posts/${postId}/comments/${comment.id}`, { method: 'DELETE' });
                        showToast('评论已删除', 'success');
                        renderModalComments(overlay, postId);
                    } catch (error) {
                        showToast(error.message || '删除失败', 'error');
                    }
                });
            }
            listEl.appendChild(item);
        });
    } catch (error) {
        console.error('Failed to load comments:', error);
        listEl.innerHTML = '<p class="comments-empty">评论加载失败，请稍后重试</p>';
    }
}

function formatCommentTime(iso) {
    try {
        const d = new Date(iso);
        return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (_) {
        return '';
    }
}

function modalEscHandler(e) {
    if (e.key === 'Escape') closePostModal();
}

function closePostModal(immediate = false) {
    const overlay = document.getElementById('postModal');
    if (!overlay) return;
    document.removeEventListener('keydown', modalEscHandler);
    document.body.style.overflow = '';
    if (immediate) {
        overlay.remove();
        return;
    }
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 300);
}

// 点赞处理：每个文章每个浏览器只能点赞一次，带爆心动画
async function handleLike(btn, postId) {
    const likedIds = getLikedIds();
    if (likedIds.includes(postId)) {
        showToast('已经点过赞啦，感谢支持～', 'info');
        return;
    }
    try {
        const res = await apiRequest(`/api/posts/${postId}/like`, { method: 'POST' });
        likedIds.push(postId);
        modalState.likedIds = likedIds;
        localStorage.setItem('likedPosts', JSON.stringify(likedIds));
        // 更新页面上所有该文章的点赞计数
        document.querySelectorAll(`.like-btn[data-post-id="${postId}"] .like-count, .blog-item[data-post-id="${postId}"] .like-count`).forEach(el => {
            el.textContent = res.likes;
        });
        if (btn) {
            btn.classList.add('liked');
            spawnHearts(btn);
        }
        showToast('点赞成功，谢谢你的喜欢！', 'success');
    } catch (error) {
        showToast(error.message || '点赞失败', 'error');
    }
}

// 爆心动画：从按钮上方飘出若干小心心
function spawnHearts(btn) {
    if (prefersReducedMotion) return;
    const rect = btn.getBoundingClientRect();
    for (let i = 0; i < 6; i++) {
        const heart = document.createElement('span');
        heart.className = 'float-heart';
        heart.innerHTML = '<i class="fas fa-heart"></i>';
        heart.style.left = (rect.left + rect.width / 2 + (Math.random() - 0.5) * 40) + 'px';
        heart.style.top = (rect.top - 6) + 'px';
        heart.style.setProperty('--hx', (Math.random() - 0.5) * 60 + 'px');
        heart.style.animationDelay = (i * 90) + 'ms';
        document.body.appendChild(heart);
        setTimeout(() => heart.remove(), 1400);
    }
}

// ---------- 公共页面外壳（导航 / 回到顶部 / 滚动显现） ----------
function setupPublicShell() {
    const navBar = document.querySelector('.nav-bar');
    const backToTop = document.getElementById('backToTop');

    // 给返回顶部按钮加滚动进度环
    if (backToTop && !backToTop.querySelector('.progress-ring')) {
        const RADIUS = 21;
        const CIRC = 2 * Math.PI * RADIUS;
        const ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        ring.setAttribute('class', 'progress-ring');
        ring.setAttribute('viewBox', '0 0 48 48');
        ring.innerHTML = `
            <circle class="ring-track" cx="24" cy="24" r="${RADIUS}"></circle>
            <circle class="ring-bar" cx="24" cy="24" r="${RADIUS}" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"></circle>
        `;
        backToTop.appendChild(ring);
        backToTop._ringBar = ring.querySelector('.ring-bar');
        backToTop._ringCirc = CIRC;
    }

    let scrollTicking = false;
    function onScroll() {
        if (scrollTicking) return;
        scrollTicking = true;
        requestAnimationFrame(() => {
            const y = window.scrollY;
            if (navBar) navBar.classList.toggle('scrolled', y > 50);
            if (backToTop) {
                backToTop.classList.toggle('visible', y > 300);
                // 更新进度环
                const bar = backToTop._ringBar;
                if (bar) {
                    const max = document.documentElement.scrollHeight - window.innerHeight;
                    const progress = max > 0 ? Math.min(y / max, 1) : 0;
                    bar.style.strokeDashoffset = backToTop._ringCirc * (1 - progress);
                }
            }
            scrollTicking = false;
        });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // 锚点平滑滚动
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                const targetSection = document.getElementById(href.substring(1));
                if (targetSection) {
                    window.scrollTo({ top: targetSection.offsetTop - 80, behavior: 'smooth' });
                }
            }
        });
    });

    document.querySelectorAll('a[href="#"]').forEach(link => {
        link.addEventListener('click', e => e.preventDefault());
    });

    // 滚动显现：区块 + 卡片级联入场
    if (!prefersReducedMotion) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { root: null, rootMargin: '0px', threshold: 0.1 });

        document.querySelectorAll('section').forEach(section => {
            section.classList.add('reveal');
            observer.observe(section);
            // 区块内的卡片做级联延迟
            const cards = section.querySelectorAll('.card, .info-item, .update-item, .blog-item');
            cards.forEach((card, i) => {
                card.classList.add('reveal-child');
                card.style.animationDelay = `${Math.min(i * 90, 450)}ms`;
                observer.observe(card);
            });
        });

        // 兜底：万一 IntersectionObserver 未触发，1.5 秒后强制显示，避免内容不可见
        setTimeout(() => {
            document.querySelectorAll('.reveal:not(.visible), .reveal-child:not(.visible)').forEach(el => el.classList.add('visible'));
        }, 1500);
    } else {
        document.querySelectorAll('section, .card, .info-item, .update-item, .blog-item').forEach(el => el.classList.add('visible'));
    }
}

// ---------- 动效：樱花飘落 ----------
function initPetals() {
    if (prefersReducedMotion || document.body.classList.contains('admin-page')) return;
    const COUNT = window.innerWidth < 768 ? 8 : 14;
    const container = document.createElement('div');
    container.className = 'petal-container';
    container.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < COUNT; i++) {
        const petal = document.createElement('span');
        petal.className = 'petal';
        petal.style.setProperty('--x', Math.random() * 100 + 'vw');
        petal.style.setProperty('--size', (8 + Math.random() * 10) + 'px');
        petal.style.setProperty('--fall', (9 + Math.random() * 10) + 's');
        petal.style.setProperty('--drift', (Math.random() * 120 - 60) + 'px');
        petal.style.setProperty('--delay', (Math.random() * 12) + 's');
        petal.style.setProperty('--spin', (Math.random() > 0.5 ? '1' : '-1'));
        container.appendChild(petal);
    }
    document.body.appendChild(container);
}

// ---------- 动效：卡片聚光灯跟随 + 3D 倾斜 ----------
function initCardEffects() {
    if (prefersReducedMotion) return;
    const cards = document.querySelectorAll('.card, .info-item, .update-item, .blog-item, .post-item, .login-card');
    cards.forEach(card => {
        // 聚光灯：把鼠标位置写入 CSS 变量
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
            card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
        });
    });

    // 3D 倾斜（仅精确指针设备）
    if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
        document.querySelectorAll('.info-item').forEach(item => {
            item.addEventListener('mousemove', (e) => {
                const rect = item.getBoundingClientRect();
                const rx = ((e.clientY - rect.top) / rect.height - 0.5) * -8;
                const ry = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
                item.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
            });
            item.addEventListener('mouseleave', () => {
                item.style.transform = '';
            });
        });
    }
}

// ---------- 动效：按钮涟漪 ----------
function initRipples() {
    if (prefersReducedMotion) return;
    const selector = '.btn, .quote-btn, .login-btn, .action-btn, .filter-btn, .carousel-btn, .back-to-top, .logout-btn';
    document.addEventListener('click', (e) => {
        const btn = e.target.closest(selector);
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
    });
}

// ---------- 动效：打字机标语 ----------
function typewriter(el, text, speed = 90) {
    if (!el) return;
    if (prefersReducedMotion) {
        el.textContent = text;
        return;
    }
    el.textContent = '';
    el.classList.add('typing');
    let i = 0;
    (function type() {
        if (i < text.length) {
            el.textContent += text[i++];
            setTimeout(type, speed);
        } else {
            // 完成后移除光标（保留样式优雅过渡）
            setTimeout(() => el.classList.remove('typing'), 1600);
        }
    })();
}

// ---------- 站点信息应用（让"设置"里的网站名称/标语真正生效） ----------
async function applySiteInfo({ applyHero = false } = {}) {
    try {
        const info = await apiRequest('/api/site-info');
        if (!info) return;
        // 仅主页把标题替换为站点名；子页面保留"页面名 - 站点名"格式，只更新 logo
        if (applyHero) document.title = info.siteName || document.title;
        const logo = document.querySelector('.nav-logo');
        if (logo && info.siteName) logo.textContent = info.siteName;
        if (applyHero) {
            const nameEl = document.querySelector('.name');
            const taglineEl = document.querySelector('.tagline');
            if (nameEl && info.siteName) nameEl.textContent = info.siteName;
            if (taglineEl && info.siteTagline) typewriter(taglineEl, info.siteTagline);
        }
    } catch (error) {
        console.error('Failed to load site info:', error);
    }
}

// ============================================================
// index.html
// ============================================================
function initIndexPage() {
    loadCarouselImages();
    loadInspirationalQuotes();
    loadIndexAbout();
    applySiteInfo({ applyHero: true });

    setupPublicShell();
    initPetals();
    initCardEffects();
    initRipples();

    // ---- 实时时钟（数字翻动动画） ----
    const timeEl = document.getElementById('currentTime');
    const dateEl = document.getElementById('currentDate');

    function renderTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
        const dateStr = now.toLocaleDateString('zh-CN', {
            year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
        });
        // 将时间字符串拆分为字符 span，变化的字符播放翻动动画
        if (timeEl) {
            if (timeEl.childElementCount !== timeStr.length) {
                timeEl.innerHTML = '';
                for (const ch of timeStr) {
                    const span = document.createElement('span');
                    span.className = ch === ':' ? 'time-colon' : 'time-digit';
                    span.textContent = ch;
                    timeEl.appendChild(span);
                }
            } else {
                const spans = timeEl.children;
                for (let i = 0; i < timeStr.length; i++) {
                    if (spans[i].textContent !== timeStr[i]) {
                        spans[i].textContent = timeStr[i];
                        spans[i].classList.remove('pop');
                        void spans[i].offsetWidth; // 重新触发动画
                        spans[i].classList.add('pop');
                    }
                }
            }
        }
        if (dateEl) dateEl.textContent = dateStr;
    }
    renderTime();
    setInterval(renderTime, 1000);

    // ---- 轮播图（自动播放 + 触摸滑动 + Ken Burns） ----
    const carouselTrack = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const carouselDots = document.getElementById('carouselDots');
    const slides = document.querySelectorAll('.carousel-slide');
    let currentSlide = 0;
    const totalSlides = slides.length;
    let isAnimating = false;
    let autoPlayInterval = null;

    slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `切换到第 ${index + 1} 张`);
        dot.addEventListener('click', () => manualGoTo(index));
        carouselDots.appendChild(dot);
    });

    function updateCarousel(animate = true) {
        carouselTrack.style.transition = animate && !prefersReducedMotion ? 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)' : 'none';
        carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
        slides.forEach((slide, i) => slide.classList.toggle('active', i === currentSlide));
        document.querySelectorAll('.carousel-dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    function goToSlide(index) {
        if (isAnimating) return;
        isAnimating = true;
        currentSlide = (index + totalSlides) % totalSlides;
        updateCarousel(true);
        setTimeout(() => { isAnimating = false; }, 550);
    }

    // 手动切换后重置自动播放计时器
    function manualGoTo(index) {
        goToSlide(index);
        restartAutoPlay();
    }

    function startAutoPlay() {
        stopAutoPlay();
        if (prefersReducedMotion) return;
        autoPlayInterval = setInterval(() => goToSlide(currentSlide + 1), 5000);
    }

    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
        autoPlayInterval = null;
    }

    function restartAutoPlay() {
        startAutoPlay();
    }

    if (prevBtn) prevBtn.addEventListener('click', () => manualGoTo(currentSlide - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => manualGoTo(currentSlide + 1));

    carouselTrack.addEventListener('mouseenter', stopAutoPlay);
    carouselTrack.addEventListener('mouseleave', startAutoPlay);

    // 触摸滑动支持（移动端）
    let touchStartX = 0;
    let touchEndX = 0;
    carouselTrack.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].clientX;
        stopAutoPlay();
    }, { passive: true });
    carouselTrack.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].clientX;
        const delta = touchEndX - touchStartX;
        if (Math.abs(delta) > 40) {
            manualGoTo(currentSlide + (delta < 0 ? 1 : -1));
        }
        startAutoPlay();
    }, { passive: true });

    // 页面不可见时暂停自动播放，省电且防止切回来时疯狂翻页
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoPlay(); else startAutoPlay();
    });

    updateCarousel(false);
    startAutoPlay();

    // ---- 每日一句（不重复抽取） ----
    const quoteText = document.getElementById('quoteText');
    const quoteAuthor = document.getElementById('quoteAuthor');
    const newQuoteBtn = document.getElementById('newQuoteBtn');
    let lastQuoteIndex = -1;

    function updateQuote() {
        let quotes;
        try {
            quotes = JSON.parse(sessionStorage.getItem('inspirationalQuotes'));
        } catch (_) { quotes = null; }
        if (!Array.isArray(quotes) || quotes.length === 0) {
            quotes = ['每一个不曾起舞的日子，都是对生命的辜负。'];
        }
        if (quotes.length === 1) lastQuoteIndex = -1;

        let randomIndex = Math.floor(Math.random() * quotes.length);
        // 避免和上一句重复
        while (randomIndex === lastQuoteIndex && quotes.length > 1) {
            randomIndex = Math.floor(Math.random() * quotes.length);
        }
        lastQuoteIndex = randomIndex;
        const quote = quotes[randomIndex];

        if (prefersReducedMotion) {
            quoteText.textContent = quote;
            return;
        }
        quoteText.style.opacity = 0;
        quoteText.style.transform = 'translateY(8px)';
        setTimeout(() => {
            quoteText.textContent = quote;
            quoteText.style.opacity = 1;
            quoteText.style.transform = 'translateY(0)';
        }, 300);
    }

    if (newQuoteBtn) {
        quoteText.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        newQuoteBtn.addEventListener('click', updateQuote);
    }

    // ---- 最新动态（带入场级联 + 点击阅读） ----
    let indexPosts = [];
    async function loadUpdates() {
        try {
            const posts = await apiRequest('/api/posts');
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            indexPosts = posts;
            const updatesList = document.querySelector('.updates-list');
            updatesList.innerHTML = '';

            if (posts.length === 0) {
                updatesList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-feather"></i>
                        <p>还没有发布过动态，快去后台写一篇吧～</p>
                    </div>`;
                return;
            }

            posts.slice(0, 5).forEach((post, i) => {
                const updateItem = document.createElement('article');
                updateItem.className = 'update-item';
                updateItem.style.setProperty('--i', i);
                const contentText = String(post.content || '');
                updateItem.innerHTML = `
                    <div class="update-date">${escapeHtml(post.date || '')}</div>
                    <div class="update-content">
                        <h3 class="update-title">${escapeHtml(post.title || '')}</h3>
                        <p class="update-desc">${escapeHtml(contentText.substring(0, 50))}${contentText.length > 50 ? '...' : ''}</p>
                    </div>
                `;
                updateItem.addEventListener('click', () => openPostModal(post));
                updatesList.appendChild(updateItem);
            });
        } catch (error) {
            console.error('Failed to load updates:', error);
        }
    }
    loadUpdates();
}

// 加载轮播图
async function loadCarouselImages() {
    const defaults = ['img/1.jpg', 'img/2.jpg', 'img/3.jpg', 'img/4.jpg'];
    let images = {};
    try {
        images = await apiRequest('/api/carousel-images') || {};
    } catch (error) {
        console.error('Failed to load carousel images:', error);
    }
    defaults.forEach((def, i) => {
        const img = document.getElementById(`carouselImg${i + 1}`);
        if (img) img.src = images[`image${i + 1}`] || def;
    });
}

// 加载励志语句
async function loadInspirationalQuotes() {
    const defaultQuotes = [
        '山高水长，路漫漫其修远兮，吾将上下而求索。',
        '海阔凭鱼跃，天高任鸟飞。',
        '不积跬步，无以至千里；不积小流，无以成江海。',
        '天行健，君子以自强不息；地势坤，君子以厚德载物。',
        '宝剑锋从磨砺出，梅花香自苦寒来。',
        '世上无难事，只怕有心人。'
    ];
    try {
        const quotes = await apiRequest('/api/quotes');
        sessionStorage.setItem('inspirationalQuotes', JSON.stringify(Array.isArray(quotes) && quotes.length ? quotes : defaultQuotes));
    } catch (error) {
        console.error('Failed to load quotes:', error);
        sessionStorage.setItem('inspirationalQuotes', JSON.stringify(defaultQuotes));
    }
}

// 加载关于内容（首页）
async function loadIndexAbout() {
    const defaults = [
        '这里是锋锋的小站，一个记录生活、分享想法的个人空间。',
        '喜欢动漫、游戏、编程和一切美好的事物。希望这里能给你带来一些温暖和快乐。'
    ];
    try {
        const aboutData = await apiRequest('/api/about');
        document.getElementById('aboutText1').textContent = aboutData.text1 || defaults[0];
        document.getElementById('aboutText2').textContent = aboutData.text2 || defaults[1];
    } catch (error) {
        console.error('Failed to load about content:', error);
        document.getElementById('aboutText1').textContent = defaults[0];
        document.getElementById('aboutText2').textContent = defaults[1];
    }
}

// ============================================================
// about.html
// ============================================================
function initAboutPage() {
    setupPublicShell();
    initPetals();
    initCardEffects();
    initRipples();
    applySiteInfo();

    async function loadAboutContent() {
        const aboutText = document.getElementById('aboutText');
        const fallback = [
            '这里是锋锋，一个热爱生活的普通人。',
            '喜欢动漫、游戏、编程和一切美好的事物。相信简单的生活也能充满色彩。',
            '这个网站是我记录生活、分享想法的小天地。希望这里能给你带来一些温暖和快乐。'
        ];
        try {
            const aboutContent = await apiRequest('/api/about');
            aboutText.innerHTML = '';
            const texts = [aboutContent.text1, aboutContent.text2, aboutContent.text3];
            let hasAny = false;
            texts.forEach((t, i) => {
                if (t) {
                    hasAny = true;
                    const p = document.createElement('p');
                    // 使用 textContent 防止 XSS（此前为 innerHTML，存在注入风险）
                    p.textContent = t;
                    aboutText.appendChild(p);
                }
            });
            if (!hasAny) fallback.forEach(t => {
                const p = document.createElement('p');
                p.textContent = t;
                aboutText.appendChild(p);
            });
        } catch (error) {
            console.error('Failed to load about content:', error);
            aboutText.innerHTML = '';
            fallback.forEach(t => {
                const p = document.createElement('p');
                p.textContent = t;
                aboutText.appendChild(p);
            });
        }
    }

    async function loadInterestsContent() {
        const defaults = {
            anime: '热爱观看各种类型的动漫，从热血少年到治愈日常，每一部都是心灵的慰藉。',
            game: '享受游戏带来的乐趣，无论是独立游戏还是大作，都能找到属于自己的快乐。',
            coding: '用代码创造有趣的项目，享受解决问题的过程，不断学习新技术。',
            music: '喜欢听各种风格的音乐，音乐是生活中不可或缺的调味剂。'
        };
        try {
            const interestsContent = await apiRequest('/api/interests');
            document.getElementById('animeDesc').textContent = interestsContent.anime || defaults.anime;
            document.getElementById('gameDesc').textContent = interestsContent.game || defaults.game;
            document.getElementById('codingDesc').textContent = interestsContent.coding || defaults.coding;
            document.getElementById('musicDesc').textContent = interestsContent.music || defaults.music;
        } catch (error) {
            console.error('Failed to load interests content:', error);
            document.getElementById('animeDesc').textContent = defaults.anime;
            document.getElementById('gameDesc').textContent = defaults.game;
            document.getElementById('codingDesc').textContent = defaults.coding;
            document.getElementById('musicDesc').textContent = defaults.music;
        }
    }

    async function loadContactContent() {
        const contactText = document.getElementById('contactText');
        const defaults = [
            '如果你想和我交流，可以通过以下方式联系我：',
            '邮箱：contact@example.com',
            'GitHub：github.com/yourname',
            'Twitter：@yourname'
        ];
        try {
            const contactContent = await apiRequest('/api/contact');
            contactText.innerHTML = '';
            const rows = [
                contactContent.intro,
                contactContent.email,
                contactContent.github,
                contactContent.twitter
            ];
            let hasAny = false;
            rows.forEach(text => {
                if (text) {
                    hasAny = true;
                    const p = document.createElement('p');
                    p.textContent = text;
                    contactText.appendChild(p);
                }
            });
            if (!hasAny) defaults.forEach(text => {
                const p = document.createElement('p');
                p.textContent = text;
                contactText.appendChild(p);
            });
        } catch (error) {
            console.error('Failed to load contact content:', error);
            contactText.innerHTML = '';
            defaults.forEach(text => {
                const p = document.createElement('p');
                p.textContent = text;
                contactText.appendChild(p);
            });
        }
    }

    loadAboutContent();
    loadInterestsContent();
    loadContactContent();
}

// ============================================================
// blog.html
// ============================================================
function initBlogPage() {
    setupPublicShell();
    initPetals();
    initCardEffects();
    initRipples();
    applySiteInfo();
    modalState.likedIds = getLikedIds();

    let postsCache = [];

    async function loadBlogPosts() {
        try {
            const posts = await apiRequest('/api/posts');
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            postsCache = posts;
            const blogList = document.getElementById('blogList');
            blogList.innerHTML = '';

            if (posts.length === 0) {
                blogList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-feather"></i>
                        <p>还没有发布过文章，敬请期待～</p>
                    </div>`;
                return;
            }

            posts.forEach((post, i) => {
                const blogItem = document.createElement('article');
                blogItem.className = 'blog-item';
                blogItem.style.setProperty('--i', i);
                blogItem.setAttribute('data-post-id', post.id);
                const contentText = String(post.content || '');
                const liked = modalState.likedIds.includes(post.id);
                blogItem.innerHTML = `
                    <div class="blog-date">${escapeHtml(post.date || '')}</div>
                    <div class="blog-content">
                        <h3 class="blog-title">${escapeHtml(post.title || '')}</h3>
                        <p class="blog-desc">${escapeHtml(contentText.substring(0, 100))}${contentText.length > 100 ? '...' : ''}</p>
                        <div class="blog-tags">
                            ${(post.tags || []).map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('')}
                        </div>
                        <div class="blog-meta">
                            <span><i class="fas fa-eye"></i> ${Number(post.views) || 0}</span>
                            <button class="meta-like-btn ${liked ? 'liked' : ''}" data-post-id="${post.id}" title="点赞">
                                <i class="fas fa-heart"></i> <span class="like-count">${Number(post.likes) || 0}</span>
                            </button>
                            <span class="meta-comments"><i class="fas fa-comment"></i> ${Number(post.comments) || 0}</span>
                            <span class="read-more"><i class="fas fa-book-open"></i> 阅读全文</span>
                        </div>
                    </div>
                `;
                // 点击卡片打开阅读弹窗（点赞按钮除外）
                blogItem.addEventListener('click', (e) => {
                    if (e.target.closest('.meta-like-btn')) return;
                    openPostModal(post);
                });
                const likeBtn = blogItem.querySelector('.meta-like-btn');
                likeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    handleLike(likeBtn, post.id);
                });
                blogList.appendChild(blogItem);
            });
        } catch (error) {
            console.error('Failed to load blog posts:', error);
            document.getElementById('blogList').innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-cloud"></i>
                    <p>文章加载失败，请稍后刷新重试</p>
                </div>`;
        }
    }
    loadBlogPosts();
}

// ============================================================
// admin.html
// ============================================================
function initAdminPage() {
    // 若已登录则直接进入后台
    if (sessionStorage.getItem('isLoggedIn') === 'true' && sessionStorage.getItem('adminToken')) {
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('loginForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const loginBtn = this.querySelector('.login-btn');
        const originalHtml = loginBtn.innerHTML;

        loginBtn.disabled = true;
        loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await response.json().catch(() => ({}));
            if (response.ok && data.success) {
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('adminToken', data.token);
                showToast('登录成功，正在进入后台...', 'success');
                setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
            } else {
                showToast(data.message || '用户名或密码错误！', 'error');
                loginBtn.disabled = false;
                loginBtn.innerHTML = originalHtml;
            }
        } catch (error) {
            console.error('Login error:', error);
            showToast('登录失败：' + error.message, 'error');
            loginBtn.disabled = false;
            loginBtn.innerHTML = originalHtml;
        }
    });
}

// ============================================================
// dashboard.html（发布 / 编辑文章）
// ============================================================
function initDashboardPage() {
    if (!checkAuth()) return;
    initRipples();

    const form = document.getElementById('postForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const sectionTitle = document.getElementById('postSectionTitle');
    const categoryMap = { 'life': '生活', 'tech': '技术', 'anime': '动漫', 'game': '游戏' };
    const categoryReverseMap = { '生活': 'life', '技术': 'tech', '动漫': 'anime', '游戏': 'game' };
    let editingPostId = null;

    // 修复：此前 editPost 跳转到 dashboard.html?edit=id 后无人处理，编辑流程断裂
    function loadEditingPost() {
        const params = new URLSearchParams(window.location.search);
        const editId = params.get('edit') || sessionStorage.getItem('editingPostId');
        if (!editId) return;
        editingPostId = parseInt(editId, 10);

        apiRequest(`/api/posts/${editingPostId}`)
            .then(post => {
                document.getElementById('postTitle').value = post.title || '';
                document.getElementById('postCategory').value = categoryReverseMap[post.category] || '';
                document.getElementById('postTags').value = (post.tags || []).join(', ');
                document.getElementById('postContent').value = post.content || '';
                // 切换为编辑模式
                if (sectionTitle) sectionTitle.textContent = '编辑文章';
                submitBtn.innerHTML = '<i class="fas fa-save"></i> 保存修改';
                showToast(`正在编辑《${post.title}》`, 'info');
            })
            .catch(error => {
                console.error('Failed to load post for editing:', error);
                showToast(error.message || '加载文章失败', 'error');
                exitEditMode();
            });
    }

    function exitEditMode() {
        editingPostId = null;
        sessionStorage.removeItem('editingPostId');
        if (window.location.search) {
            history.replaceState(null, '', 'dashboard.html');
        }
        if (sectionTitle) sectionTitle.textContent = '发布新文章';
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 发布文章';
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const title = document.getElementById('postTitle').value.trim();
        const category = document.getElementById('postCategory').value;
        const tags = document.getElementById('postTags').value;
        const content = document.getElementById('postContent').value;

        if (!title || !content) {
            showToast('标题和内容不能为空', 'error');
            return;
        }

        const payload = {
            title,
            category: categoryMap[category] || '日记',
            tags: tags.split(/[,，]/).map(tag => tag.trim()).filter(Boolean),
            content,
            date: new Date().toISOString().split('T')[0]
        };

        try {
            if (editingPostId) {
                await apiRequest(`/api/posts/${editingPostId}`, {
                    method: 'PUT',
                    body: JSON.stringify(payload)
                });
                showToast(`文章《${title}》修改成功！`, 'success');
                exitEditMode();
            } else {
                await apiRequest('/api/posts', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });
                showToast(`文章《${title}》发布成功！`, 'success');
            }
            form.reset();
            loadRecentPosts();
        } catch (error) {
            console.error('Failed to save post:', error);
            showToast(error.message || '保存失败', 'error');
        }
    });

    // 全局：清空表单（同时退出编辑模式）
    window.clearForm = function () {
        form.reset();
        exitEditMode();
        showToast('表单已清空', 'info');
    };

    async function loadRecentPosts() {
        try {
            const posts = await apiRequest('/api/posts');
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            const postsList = document.querySelector('.posts-list');
            postsList.innerHTML = '';

            if (posts.length === 0) {
                postsList.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-feather"></i>
                        <p>暂无文章</p>
                    </div>`;
                return;
            }

            posts.slice(0, 5).forEach((post, i) => {
                const postItem = document.createElement('div');
                postItem.className = 'post-item';
                postItem.style.setProperty('--i', i);
                postItem.setAttribute('data-post-id', post.id);
                postItem.innerHTML = `
                    <div class="post-info">
                        <h3 class="post-title">${escapeHtml(post.title || '')}</h3>
                        <div class="post-meta">
                            <span><i class="fas fa-calendar"></i> ${escapeHtml(post.date || '')}</span>
                            <span><i class="fas fa-folder"></i> ${escapeHtml(post.category || '')}</span>
                            <span><i class="fas fa-eye"></i> ${Number(post.views) || 0}</span>
                        </div>
                    </div>
                    <div class="post-actions">
                        <button class="action-btn edit" onclick="editPost(${post.id})">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                        <button class="action-btn delete" onclick="deletePost(${post.id})">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </div>
                `;
                postsList.appendChild(postItem);
            });
        } catch (error) {
            console.error('Failed to load recent posts:', error);
        }
    }

    window.editPost = function (id) {
        sessionStorage.setItem('editingPostId', id);
        window.location.href = 'dashboard.html?edit=' + id;
    };

    window.deletePost = async function (id) {
        if (!confirm('确定要删除这篇文章吗？删除后无法恢复！')) return;
        try {
            await apiRequest(`/api/posts/${id}`, { method: 'DELETE' });
            const postElement = document.querySelector(`.post-item[data-post-id="${id}"]`);
            if (postElement) {
                postElement.style.transition = 'opacity .3s ease, transform .3s ease';
                postElement.style.opacity = '0';
                postElement.style.transform = 'translateX(24px)';
                setTimeout(() => postElement.remove(), 300);
            }
            showToast('文章已删除', 'success');
        } catch (error) {
            console.error('Failed to delete post:', error);
            showToast(error.message || '删除失败', 'error');
        }
    };

    loadEditingPost();
    loadRecentPosts();
}

// ============================================================
// posts.html（文章管理）
// ============================================================
function initPostsPage() {
    if (!checkAuth()) return;
    initRipples();
    modalState.likedIds = getLikedIds();

    let currentFilter = '全部';
    let postsCache = [];

    function renderPostsList(filteredPosts) {
        const postsList = document.querySelector('.posts-list');
        postsList.innerHTML = '';

        if (filteredPosts.length === 0) {
            postsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-magnifying-glass"></i>
                    <p>未找到匹配的文章</p>
                </div>`;
            return;
        }

        filteredPosts.forEach((post, i) => {
            const postItem = document.createElement('div');
            postItem.className = 'post-item';
            postItem.style.setProperty('--i', i);
            postItem.setAttribute('data-post-id', post.id);
            postItem.innerHTML = `
                <div class="post-info">
                    <h3 class="post-title">${escapeHtml(post.title || '')}</h3>
                    <div class="post-meta">
                        <span><i class="fas fa-calendar"></i> ${escapeHtml(post.date || '')}</span>
                        <span><i class="fas fa-folder"></i> ${escapeHtml(post.category || '')}</span>
                        <span><i class="fas fa-eye"></i> ${Number(post.views) || 0}</span>
                        <span><i class="fas fa-heart"></i> ${Number(post.likes) || 0}</span>
                    </div>
                </div>
                <div class="post-actions">
                    <button class="action-btn view" onclick="viewPost(${post.id})">
                        <i class="fas fa-eye"></i> 查看
                    </button>
                    <button class="action-btn edit" onclick="editPost(${post.id})">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="action-btn delete" onclick="deletePost(${post.id})">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            `;
            postsList.appendChild(postItem);
        });
    }

    function applyFilterAndRender() {
        const filtered = currentFilter === '全部'
            ? postsCache
            : postsCache.filter(p => p.category === currentFilter);
        renderPostsList(filtered);
    }

    async function loadPosts(filter = currentFilter) {
        currentFilter = filter;
        try {
            const posts = await apiRequest('/api/posts');
            posts.sort((a, b) => new Date(b.date) - new Date(a.date));
            postsCache = posts;
            applyFilterAndRender();
        } catch (error) {
            console.error('Failed to load posts:', error);
        }
    }

    window.viewPost = async function (id) {
        try {
            const post = await apiRequest(`/api/posts/${id}`);
            if (post) {
                openPostModal(post, { countView: false });
            } else {
                showToast('文章未找到！', 'error');
            }
        } catch (error) {
            console.error('Failed to view post:', error);
            showToast(error.message || '文章未找到！', 'error');
        }
    };

    window.editPost = function (id) {
        sessionStorage.setItem('editingPostId', id);
        window.location.href = 'dashboard.html?edit=' + id;
    };

    window.deletePost = async function (id) {
        if (!confirm('确定要删除这篇文章吗？删除后无法恢复！')) return;
        try {
            await apiRequest(`/api/posts/${id}`, { method: 'DELETE' });
            postsCache = postsCache.filter(p => p.id !== id);
            applyFilterAndRender();
            showToast('文章已删除', 'success');
        } catch (error) {
            console.error('Failed to delete post:', error);
            showToast(error.message || '删除失败', 'error');
        }
    };

    async function searchPosts() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        if (!searchTerm) {
            applyFilterAndRender();
            return;
        }
        const filtered = postsCache.filter(post =>
            (post.title || '').toLowerCase().includes(searchTerm) ||
            (post.content || '').toLowerCase().includes(searchTerm)
        );
        renderPostsList(filtered);
    }
    window.searchPosts = searchPosts;

    // 回车触发搜索
    document.getElementById('searchInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') searchPosts();
    });

    // 筛选按钮事件
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.getAttribute('data-filter');
            // 搜索词与筛选并存
            const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
            if (searchTerm) {
                searchPosts();
            } else {
                applyFilterAndRender();
            }
        });
    });

    loadPosts('全部');
}

// ============================================================
// settings.html
// ============================================================
function initSettingsPage() {
    if (!checkAuth()) return;
    initRipples();

    loadSettings();

    async function loadSettings() {
        try {
            const siteInfo = await apiRequest('/api/site-info');
            document.getElementById('siteName').value = siteInfo.siteName || '锋锋の小站';
            document.getElementById('siteTagline').value = siteInfo.siteTagline || '欢迎来到我的个人空间';
            document.getElementById('adminEmail').value = siteInfo.adminEmail || 'admin@example.com';

            const images = await apiRequest('/api/carousel-images');
            document.getElementById('image1').value = images.image1 || 'img/1.jpg';
            document.getElementById('image2').value = images.image2 || 'img/2.jpg';
            document.getElementById('image3').value = images.image3 || 'img/3.jpg';
            document.getElementById('image4').value = images.image4 || 'img/4.jpg';

            const quotes = await apiRequest('/api/quotes');
            for (let i = 0; i < 6; i++) {
                const el = document.getElementById(`quote${i + 1}`);
                if (el) el.value = quotes[i] || '';
            }

            const about = await apiRequest('/api/about');
            document.getElementById('aboutText1').value = about.text1 || '';
            document.getElementById('aboutText2').value = about.text2 || '';
            document.getElementById('aboutText3').value = about.text3 || '';

            const interests = await apiRequest('/api/interests');
            document.getElementById('animeDesc').value = interests.anime || '';
            document.getElementById('gameDesc').value = interests.game || '';
            document.getElementById('codingDesc').value = interests.coding || '';
            document.getElementById('musicDesc').value = interests.music || '';

            const contact = await apiRequest('/api/contact');
            document.getElementById('contactIntro').value = contact.intro || '';
            document.getElementById('emailContact').value = contact.email || '';
            document.getElementById('githubContact').value = contact.github || '';
            document.getElementById('twitterContact').value = contact.twitter || '';
        } catch (error) {
            console.error('Failed to load settings:', error);
            showToast('设置加载失败：' + error.message, 'error');
        }
    }

    // 保存网站信息
    async function saveSiteInfo(e) {
        e.preventDefault();
        try {
            await apiRequest('/api/site-info', {
                method: 'PUT',
                body: JSON.stringify({
                    siteName: document.getElementById('siteName').value,
                    siteTagline: document.getElementById('siteTagline').value,
                    adminEmail: document.getElementById('adminEmail').value
                })
            });
            showToast('个人信息已保存！', 'success');
            document.title = document.getElementById('siteName').value + ' - 设置';
        } catch (error) {
            showToast(error.message || '保存失败', 'error');
        }
    }

    // 保存轮播图
    async function saveImages(e) {
        e.preventDefault();
        try {
            await apiRequest('/api/carousel-images', {
                method: 'PUT',
                body: JSON.stringify({
                    image1: document.getElementById('image1').value,
                    image2: document.getElementById('image2').value,
                    image3: document.getElementById('image3').value,
                    image4: document.getElementById('image4').value
                })
            });
            showToast('轮播图设置已保存！', 'success');
        } catch (error) {
            showToast(error.message || '保存失败', 'error');
        }
    }

    // 保存励志语录
    async function saveQuotes(e) {
        e.preventDefault();
        const quotes = [];
        for (let i = 0; i < 6; i++) {
            const el = document.getElementById(`quote${i + 1}`);
            const val = el ? el.value.trim() : '';
            if (val) quotes.push(val);
        }
        try {
            await apiRequest('/api/quotes', {
                method: 'PUT',
                body: JSON.stringify(quotes)
            });
            showToast('励志语录已保存！', 'success');
        } catch (error) {
            showToast(error.message || '保存失败', 'error');
        }
    }

    // 保存关于内容
    async function saveAbout(e) {
        e.preventDefault();
        try {
            await apiRequest('/api/about', {
                method: 'PUT',
                body: JSON.stringify({
                    text1: document.getElementById('aboutText1').value,
                    text2: document.getElementById('aboutText2').value,
                    text3: document.getElementById('aboutText3').value
                })
            });
            showToast('关于内容已保存！', 'success');
        } catch (error) {
            showToast(error.message || '保存失败', 'error');
        }
    }

    // 保存兴趣爱好
    async function saveInterests(e) {
        e.preventDefault();
        try {
            await apiRequest('/api/interests', {
                method: 'PUT',
                body: JSON.stringify({
                    anime: document.getElementById('animeDesc').value,
                    game: document.getElementById('gameDesc').value,
                    coding: document.getElementById('codingDesc').value,
                    music: document.getElementById('musicDesc').value
                })
            });
            showToast('兴趣爱好内容已保存！', 'success');
        } catch (error) {
            showToast(error.message || '保存失败', 'error');
        }
    }

    // 保存联系方式
    async function saveContact(e) {
        e.preventDefault();
        try {
            await apiRequest('/api/contact', {
                method: 'PUT',
                body: JSON.stringify({
                    intro: document.getElementById('contactIntro').value,
                    email: document.getElementById('emailContact').value,
                    github: document.getElementById('githubContact').value,
                    twitter: document.getElementById('twitterContact').value
                })
            });
            showToast('联系方式已保存！', 'success');
        } catch (error) {
            showToast(error.message || '保存失败', 'error');
        }
    }

    document.getElementById('profileForm').addEventListener('submit', saveSiteInfo);
    document.getElementById('imagesForm').addEventListener('submit', saveImages);
    document.getElementById('quotesForm').addEventListener('submit', saveQuotes);
    document.getElementById('aboutForm').addEventListener('submit', saveAbout);
    document.getElementById('interestsForm').addEventListener('submit', saveInterests);
    document.getElementById('contactForm').addEventListener('submit', saveContact);

    // 修改密码
    document.getElementById('securityForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            showToast('两次输入的密码不一致！', 'error');
            return;
        }
        if (newPassword.length < 4) {
            showToast('密码长度不能少于4位！', 'error');
            return;
        }

        try {
            await apiRequest('/api/change-password', {
                method: 'POST',
                body: JSON.stringify({ currentPassword, newPassword })
            });
            showToast('密码已更新！', 'success');
            this.reset();
        } catch (error) {
            showToast(error.message || '修改失败', 'error');
        }
    });

    // 清除缓存
    window.clearCache = function () {
        if (confirm('确定要清除所有缓存吗？')) {
            // 只清理非鉴权缓存，避免误退出登录
            sessionStorage.removeItem('inspirationalQuotes');
            localStorage.removeItem('likedPosts');
            showToast('缓存已清除！', 'success');
        }
    };

    // 重置设置
    window.resetSettings = function () {
        if (confirm('确定要重置所有设置吗？此操作无法撤销！')) {
            apiRequest('/api/reset-settings', { method: 'POST' })
                .then(() => {
                    showToast('设置已重置！页面将刷新。', 'success');
                    setTimeout(() => location.reload(), 800);
                })
                .catch(error => {
                    console.error('Reset settings error:', error);
                    showToast(error.message || '重置设置失败', 'error');
                });
        }
    };
}

// ============================================================
// 路由分发
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
    const path = window.location.pathname;
    if (document.body.classList.contains('admin-page')) {
        if (path.includes('admin.html')) {
            initAdminPage();
        } else if (path.includes('dashboard.html')) {
            initDashboardPage();
        } else if (path.includes('posts.html')) {
            initPostsPage();
        } else if (path.includes('settings.html')) {
            initSettingsPage();
        }
    } else {
        if (path === '/' || path.endsWith('index.html') || path.endsWith('/')) {
            initIndexPage();
        } else if (path.includes('about.html')) {
            initAboutPage();
        } else if (path.includes('blog.html')) {
            initBlogPage();
        } else if (path.includes('404.html')) {
            // 404 页面无需脚本
        }
    }
});
