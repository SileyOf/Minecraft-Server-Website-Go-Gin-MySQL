/* ============================================
   HXZD Common — 所有页面共享的工具函数
   ============================================ */

const HXZD = {
  API: '/api',

  // 获取 JWT Token
  getToken() {
    return localStorage.getItem('hxzd_token');
  },

  // 获取当前用户信息
  getUser() {
    const s = localStorage.getItem('hxzd_user');
    return s ? JSON.parse(s) : null;
  },

  // 保存登录信息
  saveAuth(token, user) {
    localStorage.setItem('hxzd_token', token);
    localStorage.setItem('hxzd_user', JSON.stringify(user));
  },

  // 清除登录
  clearAuth() {
    localStorage.removeItem('hxzd_token');
    localStorage.removeItem('hxzd_user');
  },

  // 是否已登录
  isLoggedIn() {
    return !!this.getToken();
  },

  // 是否管理员
  isAdmin() {
    const u = this.getUser();
    return u && u.role === 'admin';
  },

  // 带认证的 fetch
  async authFetch(url, options = {}) {
    const token = this.getToken();
    if (token) {
      options.headers = {
        ...options.headers,
        'Authorization': 'Bearer ' + token,
      };
    }
    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      options.headers = { ...options.headers, 'Content-Type': 'application/json' };
      options.body = JSON.stringify(options.body);
    }
    const res = await fetch(this.API + url, options);
    if (res.status === 401) {
      this.clearAuth();
    }
    return res;
  },

  // 初始化导航栏登录状态
  initNav() {
    const btn = document.getElementById('navAuthBtn');
    if (!btn) return;
    const user = this.getUser();
    if (user) {
      btn.querySelector('.sao-btn-text').textContent = user.username;
      btn.querySelector('.sao-btn-icon').textContent = '●';
    }
    // 高亮当前页
    const currentPage = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.sao-btn[data-index]').forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href === currentPage) link.classList.add('active');
    });
  },

  // 加载背景图片
  async loadBackground() {
    try {
      const res = await fetch(this.API + '/settings');
      const settings = await res.json();
      const bgEl = document.getElementById('customBg');
      if (settings.background_url && bgEl) {
        bgEl.style.backgroundImage = `url(${settings.background_url})`;
      }
      // 动态 favicon
      if (settings.favicon_url) {
        let link = document.querySelector('link[rel="icon"]');
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.head.appendChild(link);
        }
        link.href = settings.favicon_url;
      }
      // 动态页脚
      if (settings.footer_text) {
        let footer = document.getElementById('siteFooter');
        if (!footer) {
          footer = document.createElement('footer');
          footer.id = 'siteFooter';
          footer.className = 'site-footer';
          document.body.appendChild(footer);
        }
        footer.textContent = settings.footer_text;
      }
      return settings;
    } catch (e) {
      return {};
    }
  },

  // Toast 通知
  toast(message, duration = 2500) {
    let toast = document.querySelector('.sao-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'sao-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), duration);
  },

  // 日期格式化
  formatDate(d) {
    return new Date(d).toLocaleDateString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit'
    });
  },

  formatDateTime(d) {
    return new Date(d).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  },

  // HTML 转义
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
};
