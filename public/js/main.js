// 通用函数

// 认证守卫：检查是否已登录，未登录则跳转到登录页
function checkAuth() {
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        window.location.href = 'admin.html';
        return false;
    }
    return true;
}

function logout() {
    if (confirm('确定要退出登录吗？')) {
        sessionStorage.removeItem('isLoggedIn');
        window.location.href = 'admin.html';
    }
}

// 通用API请求函数
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        // 204 No Content 不需要解析 JSON
        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        alert(`请求失败: ${error.message}`);
        throw error;
    }
}

// index.html 相关函数
function initIndexPage() {
    loadCarouselImages();
    loadInspirationalQuotes();
    loadAboutContent();

    const navBar = document.querySelector('.nav-bar');
    const backToTop = document.getElementById('backToTop');
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navBar.classList.add('scrolled');
        } else {
            navBar.classList.remove('scrolled');
        }

        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const targetId = href.substring(1);
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    const offsetTop = targetSection.offsetTop - 80;
                    window.scrollTo({
                        top: offsetTop,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    const links = document.querySelectorAll('a[href="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
        });
    });

    function updateTime() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
        const dateStr = now.toLocaleDateString('zh-CN', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            weekday: 'long' 
        });
        document.getElementById('currentTime').textContent = timeStr;
        document.getElementById('currentDate').textContent = dateStr;
    }

    updateTime();
    setInterval(updateTime, 1000);

    const carouselTrack = document.getElementById('carouselTrack');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const carouselDots = document.getElementById('carouselDots');
    const slides = document.querySelectorAll('.carousel-slide');
    let currentSlide = 0;
    const totalSlides = slides.length;
    let isAnimating = false;
    let autoPlayInterval;

    slides.forEach((_, index) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (index === 0 ? ' active' : '');
        dot.addEventListener('click', () => goToSlide(index));
        carouselDots.appendChild(dot);
    });

    function updateCarousel(animate = true) {
        if (animate) {
            carouselTrack.style.transition = 'transform 0.5s ease';
        } else {
            carouselTrack.style.transition = 'none';
        }
        carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
        const dots = document.querySelectorAll('.carousel-dot');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === currentSlide);
        });
    }

    function goToSlide(index) {
        if (isAnimating) return;
        isAnimating = true;
        
        if (index < 0) {
            currentSlide = totalSlides - 1;
            updateCarousel(true);
        } else if (index >= totalSlides) {
            currentSlide = 0;
            updateCarousel(true);
        } else {
            currentSlide = index;
            updateCarousel(true);
        }
        
        setTimeout(() => {
            isAnimating = false;
        }, 500);
    }

    prevBtn.addEventListener('click', () => goToSlide(currentSlide - 1));
    nextBtn.addEventListener('click', () => goToSlide(currentSlide + 1));

    function startAutoPlay() {
        autoPlayInterval = setInterval(() => {
            goToSlide(currentSlide + 1);
        }, 5000);
    }

    function stopAutoPlay() {
        clearInterval(autoPlayInterval);
    }

    carouselTrack.addEventListener('mouseenter', stopAutoPlay);
    carouselTrack.addEventListener('mouseleave', startAutoPlay);
    
    startAutoPlay();

    const quoteText = document.getElementById('quoteText');
    const quoteAuthor = document.getElementById('quoteAuthor');
    const newQuoteBtn = document.getElementById('newQuoteBtn');

    function updateQuote() {
        const quotes = JSON.parse(sessionStorage.getItem('inspirationalQuotes')) || [
            '山高水长，路漫漫其修远兮，吾将上下而求索。',
            '海阔凭鱼跃，天高任鸟飞。',
            '不积跬步，无以至千里；不积小流，无以成江海。',
            '天行健，君子以自强不息；地势坤，君子以厚德载物。',
            '宝剑锋从磨砺出，梅花香自苦寒来。',
            '世上无难事，只怕有心人。'
        ];
        
        const randomIndex = Math.floor(Math.random() * quotes.length);
        const quote = quotes[randomIndex];
        quoteText.style.opacity = 0;
        quoteAuthor.style.opacity = 0;
        
        setTimeout(() => {
            quoteText.textContent = quote;
            quoteAuthor.textContent = '';
            quoteText.style.opacity = 1;
            quoteAuthor.style.opacity = 1;
        }, 300);
    }

    newQuoteBtn.addEventListener('click', updateQuote);

    quoteText.style.transition = 'opacity 0.3s ease';
    quoteAuthor.style.transition = 'opacity 0.3s ease';

    async function loadUpdates() {
        try {
            const posts = await apiRequest('/api/posts');
            const updatesList = document.querySelector('.updates-list');
            updatesList.innerHTML = '';

            posts.slice(0, 5).forEach(post => {
                const updateItem = document.createElement('article');
                updateItem.className = 'update-item';
                updateItem.innerHTML = `
                    <div class="update-date">${post.date}</div>
                    <div class="update-content">
                        <h3 class="update-title">${post.title}</h3>
                        <p class="update-desc">${post.content.substring(0, 50)}...</p>
                    </div>
                `;
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
    try {
        const images = await apiRequest('/api/carousel-images');
        document.getElementById('carouselImg1').src = images.image1 || 'img/1.jpg';
        document.getElementById('carouselImg2').src = images.image2 || 'img/2.jpg';
        document.getElementById('carouselImg3').src = images.image3 || 'img/3.jpg';
        document.getElementById('carouselImg4').src = images.image4 || 'img/4.jpg';
    } catch (error) {
        console.error('Failed to load carousel images:', error);
        // 默认值
        document.getElementById('carouselImg1').src = 'img/1.jpg';
        document.getElementById('carouselImg2').src = 'img/2.jpg';
        document.getElementById('carouselImg3').src = 'img/3.jpg';
        document.getElementById('carouselImg4').src = 'img/4.jpg';
    }
}

// 加载励志语句
async function loadInspirationalQuotes() {
    try {
        const quotes = await apiRequest('/api/quotes');
        sessionStorage.setItem('inspirationalQuotes', JSON.stringify(quotes));
    } catch (error) {
        console.error('Failed to load quotes:', error);
        // 默认值
        const defaultQuotes = [
            '山高水长，路漫漫其修远兮，吾将上下而求索。',
            '海阔凭鱼跃，天高任鸟飞。',
            '不积跬步，无以至千里；不积小流，无以成江海。',
            '天行健，君子以自强不息；地势坤，君子以厚德载物。',
            '宝剑锋从磨砺出，梅花香自苦寒来。',
            '世上无难事，只怕有心人。'
        ];
        sessionStorage.setItem('inspirationalQuotes', JSON.stringify(defaultQuotes));
    }
}

// 加载关于内容
async function loadAboutContent() {
    try {
        const aboutData = await apiRequest('/api/about');
        document.getElementById('aboutText1').textContent = aboutData.text1 || '这里是锋锋的小站，一个记录生活、分享想法的个人空间。';
        document.getElementById('aboutText2').textContent = aboutData.text2 || '喜欢动漫、游戏、编程和一切美好的事物。希望这里能给你带来一些温暖和快乐。';
    } catch (error) {
        console.error('Failed to load about content:', error);
        // 默认值
        document.getElementById('aboutText1').textContent = '这里是锋锋的小站，一个记录生活、分享想法的个人空间。';
        document.getElementById('aboutText2').textContent = '喜欢动漫、游戏、编程和一切美好的事物。希望这里能给你带来一些温暖和快乐。';
    }
}

// about.html 相关函数
function initAboutPage() {
    const navBar = document.querySelector('.nav-bar');
    const backToTop = document.getElementById('backToTop');
    const sections = document.querySelectorAll('section');

    async function loadAboutContent() {
        try {
            const aboutContent = await apiRequest('/api/about');
            const aboutText = document.getElementById('aboutText');
            aboutText.innerHTML = '';
            
            if (aboutContent.text1) {
                const p1 = document.createElement('p');
                p1.innerHTML = aboutContent.text1;
                aboutText.appendChild(p1);
            }
            if (aboutContent.text2) {
                const p2 = document.createElement('p');
                p2.innerHTML = aboutContent.text2;
                aboutText.appendChild(p2);
            }
            if (aboutContent.text3) {
                const p3 = document.createElement('p');
                p3.innerHTML = aboutContent.text3;
                aboutText.appendChild(p3);
            }
        } catch (error) {
            console.error('Failed to load about content:', error);
            // 默认值
            const aboutText = document.getElementById('aboutText');
            aboutText.innerHTML = '<p>这里是<span class="highlight">锋锋</span>，一个热爱生活的普通人。</p>' +
                                  '<p>喜欢<span class="highlight">动漫</span>、<span class="highlight">游戏</span>、<span class="highlight">编程</span>和一切美好的事物。相信简单的生活也能充满色彩。</p>' +
                                  '<p>这个网站是我记录生活、分享想法的小天地。希望这里能给你带来一些温暖和快乐。</p>';
        }
    }

    async function loadInterestsContent() {
        try {
            const interestsContent = await apiRequest('/api/interests');
            document.getElementById('animeDesc').textContent = interestsContent.anime || '热爱观看各种类型的动漫，从热血少年到治愈日常，每一部都是心灵的慰藉。';
            document.getElementById('gameDesc').textContent = interestsContent.game || '享受游戏带来的乐趣，无论是独立游戏还是大作，都能找到属于自己的快乐。';
            document.getElementById('codingDesc').textContent = interestsContent.coding || '用代码创造有趣的项目，享受解决问题的过程，不断学习新技术。';
            document.getElementById('musicDesc').textContent = interestsContent.music || '喜欢听各种风格的音乐，音乐是生活中不可或缺的调味剂。';
        } catch (error) {
            console.error('Failed to load interests content:', error);
            // 默认值
            document.getElementById('animeDesc').textContent = '热爱观看各种类型的动漫，从热血少年到治愈日常，每一部都是心灵的慰藉。';
            document.getElementById('gameDesc').textContent = '享受游戏带来的乐趣，无论是独立游戏还是大作，都能找到属于自己的快乐。';
            document.getElementById('codingDesc').textContent = '用代码创造有趣的项目，享受解决问题的过程，不断学习新技术。';
            document.getElementById('musicDesc').textContent = '喜欢听各种风格的音乐，音乐是生活中不可或缺的调味剂。';
        }
    }

    async function loadContactContent() {
        try {
            const contactContent = await apiRequest('/api/contact');
            const contactText = document.getElementById('contactText');
            contactText.innerHTML = '';
            
            const p1 = document.createElement('p');
            p1.textContent = contactContent.intro || '如果你想和我交流，可以通过以下方式联系我：';
            contactText.appendChild(p1);
            
            const p2 = document.createElement('p');
            p2.textContent = contactContent.email || '邮箱：contact@example.com';
            contactText.appendChild(p2);
            
            const p3 = document.createElement('p');
            p3.textContent = contactContent.github || 'GitHub：github.com/yourname';
            contactText.appendChild(p3);
            
            const p4 = document.createElement('p');
            p4.textContent = contactContent.twitter || 'Twitter：@yourname';
            contactText.appendChild(p4);
        } catch (error) {
            console.error('Failed to load contact content:', error);
            // 默认值
            const contactText = document.getElementById('contactText');
            contactText.innerHTML = '<p>如果你想和我交流，可以通过以下方式联系我：</p>' +
                                    '<p>邮箱：contact@example.com</p>' +
                                    '<p>GitHub：github.com/yourname</p>' +
                                    '<p>Twitter：@yourname</p>';
        }
    }

    loadAboutContent();
    loadInterestsContent();
    loadContactContent();

    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navBar.classList.add('scrolled');
        } else {
            navBar.classList.remove('scrolled');
        }

        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
}

// blog.html 相关函数
function initBlogPage() {
    const navBar = document.querySelector('.nav-bar');
    const backToTop = document.getElementById('backToTop');
    const sections = document.querySelectorAll('section');

    async function loadBlogPosts() {
        try {
            const posts = await apiRequest('/api/posts');
            const blogList = document.getElementById('blogList');
            blogList.innerHTML = '';

            posts.forEach(post => {
                const blogItem = document.createElement('article');
                blogItem.className = 'blog-item';
                blogItem.innerHTML = `
                    <div class="blog-header">
                        <div class="blog-date">${post.date}</div>
                        <div class="blog-content">
                            <h3 class="blog-title">${post.title}</h3>
                            <p class="blog-desc">${post.content.substring(0, 100)}...</p>
                            <div class="blog-tags">
                                ${post.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
                            </div>
                            <div class="blog-meta">
                                <span><i class="fas fa-eye"></i> ${post.views}</span>
                                <span><i class="fas fa-heart"></i> ${post.likes}</span>
                                <span><i class="fas fa-comment"></i> ${post.comments}</span>
                            </div>
                        </div>
                    </div>
                `;
                blogList.appendChild(blogItem);
            });
        } catch (error) {
            console.error('Failed to load blog posts:', error);
        }
    }

    loadBlogPosts();

    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navBar.classList.add('scrolled');
        } else {
            navBar.classList.remove('scrolled');
        }

        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });

    backToTop.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    sections.forEach(section => {
        observer.observe(section);
    });
}

// admin.html 相关函数
function initAdminPage() {
    document.getElementById('loginForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // 这里需要向后端验证用户登录
        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                sessionStorage.setItem('isLoggedIn', 'true');
                window.location.href = 'dashboard.html';
            } else {
                alert('用户名或密码错误！');
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            alert('登录失败：' + error.message);
        });
    });
}

// dashboard.html 相关函数
function initDashboardPage() {
    // 认证守卫：未登录则跳转到登录页
    if (!checkAuth()) return;

    async function clearForm() {
        document.getElementById('postForm').reset();
    }

    document.getElementById('postForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const title = document.getElementById('postTitle').value;
        const category = document.getElementById('postCategory').value;
        const tags = document.getElementById('postTags').value;
        const content = document.getElementById('postContent').value;

        const categoryMap = {
            'life': '生活',
            'tech': '技术',
            'anime': '动漫',
            'game': '游戏'
        };

        try {
            const response = await apiRequest('/api/posts', {
                method: 'POST',
                body: JSON.stringify({
                    title: title,
                    category: categoryMap[category] || '日记',
                    tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
                    content: content,
                    date: new Date().toISOString().split('T')[0]
                })
            });

            alert('文章 "' + title + '" 发布成功！');
            clearForm();
            loadRecentPosts();
        } catch (error) {
            console.error('Failed to publish post:', error);
        }
    });

    async function loadRecentPosts() {
        try {
            const posts = await apiRequest('/api/posts');
            const postsList = document.querySelector('.posts-list');
            postsList.innerHTML = '';

            // 添加空状态提示
            if (posts.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.style.textAlign = 'center';
                emptyDiv.style.padding = '40px';
                emptyDiv.style.color = 'var(--text-secondary)';
                emptyDiv.textContent = '暂无文章';
                postsList.appendChild(emptyDiv);
                return;
            }

            posts.slice(0, 5).forEach(post => {
                const postItem = document.createElement('div');
                postItem.className = 'post-item';
                postItem.setAttribute('data-post-id', post.id); // 添加ID属性用于删除
                postItem.innerHTML = `
                    <div class="post-info">
                        <h3 class="post-title">${post.title}</h3>
                        <div class="post-meta">
                            <span><i class="fas fa-calendar"></i> ${post.date}</span>
                            <span><i class="fas fa-folder"></i> ${post.category}</span>
                            <span><i class="fas fa-eye"></i> ${post.views}</span>
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

    window.editPost = function(id) {
        if (confirm('确定要编辑这篇文章吗？')) {
            localStorage.setItem('editingPostId', id);
            window.location.href = 'dashboard.html?edit=' + id;
        }
    };

    window.deletePost = async function(id) {
        if (confirm('确定要删除这篇文章吗？')) {
            try {
                await apiRequest(`/api/posts/${id}`, {
                    method: 'DELETE'
                });
                
                // 从DOM中移除对应的文章
                const postElement = document.querySelector(`.post-item[data-post-id="${id}"]`);
                if (postElement) {
                    postElement.remove();
                }
                
                // 如果在文章管理页面，也需要重新加载列表
                if (window.location.pathname.includes('posts.html')) {
                    window.loadPosts && window.loadPosts();
                }
            } catch (error) {
                console.error('Failed to delete post:', error);
            }
        }
    };

    loadRecentPosts();
}

// posts.html 相关函数
function initPostsPage() {
    // 认证守卫：未登录则跳转到登录页
    if (!checkAuth()) return;

    async function loadPosts(filter = '全部') {
        try {
            const posts = await apiRequest('/api/posts');
            const postsList = document.querySelector('.posts-list');
            postsList.innerHTML = '';

            // 添加空状态提示容器
            const noPostsDiv = document.createElement('div');
            noPostsDiv.className = 'no-posts';
            noPostsDiv.style.textAlign = 'center';
            noPostsDiv.style.padding = '40px';
            noPostsDiv.style.color = 'var(--text-secondary)';
            
            let filteredPosts;
            if (filter === '全部') {
                filteredPosts = posts;
            } else {
                filteredPosts = posts.filter(p => p.category === filter);
            }

            if (filteredPosts.length === 0) {
                noPostsDiv.textContent = '暂无文章';
                postsList.appendChild(noPostsDiv);
                return;
            }

            filteredPosts.forEach(post => {
                const postItem = document.createElement('div');
                postItem.className = 'post-item';
                postItem.setAttribute('data-post-id', post.id); // 添加ID属性用于删除
                postItem.innerHTML = `
                    <div class="post-info">
                        <h3 class="post-title">${post.title}</h3>
                        <div class="post-meta">
                            <span><i class="fas fa-calendar"></i> ${post.date}</span>
                            <span><i class="fas fa-folder"></i> ${post.category}</span>
                            <span><i class="fas fa-eye"></i> ${post.views}</span>
                            <span><i class="fas fa-heart"></i> ${post.likes}</span>
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
        } catch (error) {
            console.error('Failed to load posts:', error);
        }
    }

    window.viewPost = async function(id) {
        try {
            const response = await apiRequest(`/api/posts/${id}`);
            const post = response;
            if (post) {
                alert(`标题: ${post.title}\n分类: ${post.category}\n日期: ${post.date}\n内容: ${post.content}`);
            } else {
                alert('文章未找到！');
            }
        } catch (error) {
            console.error('Failed to view post:', error);
            alert('文章未找到！');
        }
    };

    window.editPost = function(id) {
        if (confirm('确定要编辑这篇文章吗？')) {
            localStorage.setItem('editingPostId', id);
            window.location.href = 'dashboard.html?edit=' + id;
        }
    };

    window.deletePost = async function(id) {
        if (confirm('确定要删除这篇文章吗？')) {
            try {
                await apiRequest(`/api/posts/${id}`, {
                    method: 'DELETE'
                });
                
                // 从DOM中移除对应的文章
                const postElement = document.querySelector(`.post-item[data-post-id="${id}"]`);
                if (postElement) {
                    postElement.remove();
                }
                
                // 重新加载文章列表
                loadPosts();
            } catch (error) {
                console.error('Failed to delete post:', error);
            }
        }
    };

    async function searchPosts() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        try {
            const posts = await apiRequest('/api/posts');
            const postsList = document.querySelector('.posts-list');
            postsList.innerHTML = '';

            if (!searchTerm) {
                loadPosts();
                return;
            }

            const filteredPosts = posts.filter(post => 
                post.title.toLowerCase().includes(searchTerm) || 
                (post.content && post.content.toLowerCase().includes(searchTerm))
            );

            const noPostsDiv = document.createElement('div');
            noPostsDiv.className = 'no-posts';
            noPostsDiv.style.textAlign = 'center';
            noPostsDiv.style.padding = '40px';
            noPostsDiv.style.color = 'var(--text-secondary)';

            if (filteredPosts.length === 0) {
                noPostsDiv.textContent = '未找到匹配的文章';
                postsList.appendChild(noPostsDiv);
                return;
            }

            filteredPosts.forEach(post => {
                const postItem = document.createElement('div');
                postItem.className = 'post-item';
                postItem.setAttribute('data-post-id', post.id); // 添加ID属性用于删除
                postItem.innerHTML = `
                    <div class="post-info">
                        <h3 class="post-title">${post.title}</h3>
                        <div class="post-meta">
                            <span><i class="fas fa-calendar"></i> ${post.date}</span>
                            <span><i class="fas fa-folder"></i> ${post.category}</span>
                            <span><i class="fas fa-eye"></i> ${post.views}</span>
                            <span><i class="fas fa-heart"></i> ${post.likes}</span>
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
        } catch (error) {
            console.error('Failed to search posts:', error);
        }
    }

    // 初始化筛选按钮事件
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            const filter = this.getAttribute('data-filter');
            loadPosts(filter);
        });
    });

    // 加载初始文章列表
    loadPosts();
    
    // 绑定搜索函数到全局作用域
    window.searchPosts = searchPosts;
}

// settings.html 相关函数
function initSettingsPage() {
    // 认证守卫：未登录则跳转到登录页
    if (!checkAuth()) return;

    // 页面加载时：填充数据
    loadSettings();
    
    async function loadSettings() {
        try {
            // 获取网站信息
            const siteInfo = await apiRequest('/api/site-info');
            document.getElementById('siteName').value = siteInfo.siteName || '锋锋の小站';
            document.getElementById('siteTagline').value = siteInfo.siteTagline || '欢迎来到我的个人空间';
            document.getElementById('adminEmail').value = siteInfo.adminEmail || 'admin@example.com';

            // 获取轮播图
            const images = await apiRequest('/api/carousel-images');
            document.getElementById('image1').value = images.image1 || 'img/1.jpg';
            document.getElementById('image2').value = images.image2 || 'img/2.jpg';
            document.getElementById('image3').value = images.image3 || 'img/3.jpg';
            document.getElementById('image4').value = images.image4 || 'img/4.jpg';

            // 获取语录
            const quotes = await apiRequest('/api/quotes');
            document.getElementById('quote1').value = quotes[0] || '';
            document.getElementById('quote2').value = quotes[1] || '';
            document.getElementById('quote3').value = quotes[2] || '';
            document.getElementById('quote4').value = quotes[3] || '';
            document.getElementById('quote5').value = quotes[4] || '';
            document.getElementById('quote6').value = quotes[5] || '';

            // 获取关于内容
            const about = await apiRequest('/api/about');
            document.getElementById('aboutText1').value = about.text1 || '';
            document.getElementById('aboutText2').value = about.text2 || '';
            document.getElementById('aboutText3').value = about.text3 || '';

            // 获取兴趣爱好
            const interests = await apiRequest('/api/interests');
            document.getElementById('animeDesc').value = interests.anime || '热爱观看各种类型的动漫，从热血少年到治愈日常，每一部都是心灵的慰藉。';
            document.getElementById('gameDesc').value = interests.game || '享受游戏带来的乐趣，无论是独立游戏还是大作，都能找到属于自己的快乐。';
            document.getElementById('codingDesc').value = interests.coding || '用代码创造有趣的项目，享受解决问题的过程，不断学习新技术。';
            document.getElementById('musicDesc').value = interests.music || '喜欢听各种风格的音乐，音乐是生活中不可或缺的调味剂。';

            // 获取联系方式
            const contact = await apiRequest('/api/contact');
            document.getElementById('contactIntro').value = contact.intro || '如果你想和我交流，可以通过以下方式联系我：';
            document.getElementById('emailContact').value = contact.email || '邮箱：contact@example.com';
            document.getElementById('githubContact').value = contact.github || 'GitHub：github.com/yourname';
            document.getElementById('twitterContact').value = contact.twitter || 'Twitter：@yourname';
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    }

    // 保存网站信息
    async function saveSiteInfo(e) {
        e.preventDefault();
        const siteInfo = {
            siteName: document.getElementById('siteName').value,
            siteTagline: document.getElementById('siteTagline').value,
            adminEmail: document.getElementById('adminEmail').value
        };
        
        try {
            await apiRequest('/api/site-info', {
                method: 'PUT',
                body: JSON.stringify(siteInfo)
            });
            alert('个人信息已保存！');
            
            // 更新页面标题
            document.title = siteInfo.siteName + ' - 设置';
        } catch (error) {
            console.error('Failed to save site info:', error);
        }
    }

    // 保存轮播图
    async function saveImages(e) {
        e.preventDefault(); // 阻止表单默认提交刷新
        const images = {
            image1: document.getElementById('image1').value,
            image2: document.getElementById('image2').value,
            image3: document.getElementById('image3').value,
            image4: document.getElementById('image4').value
        };
        
        try {
            await apiRequest('/api/carousel-images', {
                method: 'PUT',
                body: JSON.stringify(images)
            });
            alert('轮播图设置已保存！');
        } catch (error) {
            console.error('Failed to save carousel images:', error);
        }
    }

    // 保存励志语录
    async function saveQuotes(e) {
        e.preventDefault();
        const quotes = [
            document.getElementById('quote1').value,
            document.getElementById('quote2').value,
            document.getElementById('quote3').value,
            document.getElementById('quote4').value,
            document.getElementById('quote5').value,
            document.getElementById('quote6').value
        ];
        
        try {
            await apiRequest('/api/quotes', {
                method: 'PUT',
                body: JSON.stringify(quotes)
            });
            alert('励志语录已保存！');
        } catch (error) {
            console.error('Failed to save quotes:', error);
        }
    }

    // 保存关于内容
    async function saveAbout(e) {
        e.preventDefault();
        const about = {
            text1: document.getElementById('aboutText1').value,
            text2: document.getElementById('aboutText2').value,
            text3: document.getElementById('aboutText3').value
        };
        
        try {
            await apiRequest('/api/about', {
                method: 'PUT',
                body: JSON.stringify(about)
            });
            alert('关于内容已保存！');
        } catch (error) {
            console.error('Failed to save about content:', error);
        }
    }

    // 保存兴趣爱好
    async function saveInterests(e) {
        e.preventDefault();
        const interests = {
            anime: document.getElementById('animeDesc').value,
            game: document.getElementById('gameDesc').value,
            coding: document.getElementById('codingDesc').value,
            music: document.getElementById('musicDesc').value
        };
        
        try {
            await apiRequest('/api/interests', {
                method: 'PUT',
                body: JSON.stringify(interests)
            });
            alert('兴趣爱好内容已保存！');
        } catch (error) {
            console.error('Failed to save interests:', error);
        }
    }

    // 保存联系方式
    async function saveContact(e) {
        e.preventDefault();
        const contact = {
            intro: document.getElementById('contactIntro').value,
            email: document.getElementById('emailContact').value,
            github: document.getElementById('githubContact').value,
            twitter: document.getElementById('twitterContact').value
        };
        
        try {
            await apiRequest('/api/contact', {
                method: 'PUT',
                body: JSON.stringify(contact)
            });
            alert('联系方式已保存！');
        } catch (error) {
            console.error('Failed to save contact:', error);
        }
    }

    // 添加表单提交事件监听器
    document.getElementById('profileForm').addEventListener('submit', saveSiteInfo);
    document.getElementById('imagesForm').addEventListener('submit', saveImages);
    document.getElementById('quotesForm').addEventListener('submit', saveQuotes);
    document.getElementById('aboutForm').addEventListener('submit', saveAbout);
    document.getElementById('interestsForm').addEventListener('submit', saveInterests);
    document.getElementById('contactForm').addEventListener('submit', saveContact);

    // 修改密码逻辑（保持原样，但建议加上 e.preventDefault）
    document.getElementById('securityForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (newPassword !== confirmPassword) {
            alert('两次输入的密码不一致！');
            return;
        }
        if (newPassword.length < 4) {
            alert('密码长度不能少于4位！');
            return;
        }
        
        try {
            await apiRequest('/api/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    currentPassword,
                    newPassword
                })
            });
            alert('密码已更新！');
            this.reset();
        } catch (error) {
            console.error('Failed to change password:', error);
        }
    });

    // 其他按钮
    window.clearCache = function() {
        if (confirm('确定要清除所有缓存吗？')) {
            sessionStorage.clear();
            alert('缓存已清除！页面将刷新。');
            location.reload();
        }
    };
    
    window.resetSettings = function() {
        if (confirm('确定要重置所有设置吗？此操作无法撤销！')) {
            // 这里应该调用后端API重置设置
            fetch('/api/reset-settings', {
                method: 'POST'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('设置已重置！页面将刷新。');
                    location.reload();
                } else {
                    alert('重置设置失败！');
                }
            })
            .catch(error => {
                console.error('Reset settings error:', error);
                alert('重置设置失败：' + error.message);
            });
        }
    };
}

// DOM加载完成后执行相应初始化函数
document.addEventListener('DOMContentLoaded', function() {
    const path = window.location.pathname;
    // 根据当前页面执行相应的初始化函数
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
        if (path === '/' || path.includes('index.html')) {
            initIndexPage();
        } else if (path.includes('about.html')) {
            initAboutPage();
        } else if (path.includes('blog.html')) {
            initBlogPage();
        }
    }
});