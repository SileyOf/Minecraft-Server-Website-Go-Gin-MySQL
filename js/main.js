/* ============================================
   HXZD — 首页 Main JavaScript
   ============================================ */

let _serversData = [];
let _rotateIdx = 0;
let _rotateTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  HXZD.initNav();
  HXZD.loadBackground();
  loadSiteSettings();
  loadServerStatus();
  loadLatestAnnouncements();


  // 每 60 秒刷新服务器状态
  setInterval(loadServerStatus, 60000);
});

/* ---------- 加载网站设置（含标题） ---------- */
async function loadSiteSettings() {
  try {
    const res = await fetch(HXZD.API + '/settings');
    const s = await res.json();

    // 同步主标题
    const titleEl = document.querySelector('.glitch-text');
    if (titleEl && s.main_title) {
      titleEl.textContent = s.main_title;
      titleEl.setAttribute('data-text', s.main_title);
    }
    // 页面 title
    if (s.site_title) document.title = s.site_title;

    // 同步副标题
    const subEl = document.getElementById('siteSubtitle');
    if (subEl && s.site_subtitle) subEl.textContent = '— ' + s.site_subtitle + ' —';
    // 同步描述
    const descEl = document.getElementById('siteDescription');
    if (descEl && s.site_description) descEl.textContent = s.site_description;
  } catch (e) {
    console.error('Failed to load site settings:', e);
  }
}

/* ---------- 加载服务器状态（多服务器） ---------- */
async function loadServerStatus() {
  try {
    const res = await fetch(HXZD.API + '/server-status');
    const data = await res.json();

    const servers = data.servers || [];
    const totalOnline = data.total_online || 0;
    const totalMax = data.total_max || 0;

    _serversData = servers;

    // 更新 hero stats 总数
    const onlineEl = document.getElementById('onlinePlayers');
    const maxEl = document.getElementById('maxPlayers');
    const latencyEl = document.getElementById('serverLatency');

    if (onlineEl) animateCount(onlineEl, totalOnline);
    if (maxEl) animateCount(maxEl, totalMax);

    // 延迟取第一个在线服务器
    const firstOnline = servers.find(s => s.online);
    if (latencyEl) latencyEl.textContent = '—';

    // MOTD
    const motdEl = document.getElementById('motdText');
    const motdBanner = document.getElementById('motdBanner');
    if (firstOnline && firstOnline.motd) {
      if (motdEl) motdEl.textContent = firstOnline.motd;
      if (motdBanner) motdBanner.style.display = 'flex';
    }

    // Server Info 轮播
    setupServerInfoRotation(servers);

  } catch (e) {
    console.error('Failed to load server status:', e);
    const statusDot = document.getElementById('serverStatusDot');
    if (statusDot) statusDot.innerHTML = '<span style="color:#f87171">●</span> 离线';
  }
}

/* ---------- Server Info 轮播/显示 ---------- */
function setupServerInfoRotation(servers) {
  if (_rotateTimer) clearInterval(_rotateTimer);

  if (servers.length === 0) {
    updateServerInfoCard(null);
    return;
  }

  if (servers.length === 1) {
    updateServerInfoCard(servers[0]);
    const label = document.getElementById('serverInfoLabel');
    if (label) label.textContent = '';
    return;
  }

  // 多个服务器 → 每 5 秒轮换
  _rotateIdx = 0;
  updateServerInfoCard(servers[0]);

  _rotateTimer = setInterval(() => {
    _rotateIdx = (_rotateIdx + 1) % servers.length;
    const rotator = document.getElementById('serverInfoRotator');
    if (rotator) {
      rotator.style.opacity = '0';
      rotator.style.transform = 'translateY(8px)';
      setTimeout(() => {
        updateServerInfoCard(servers[_rotateIdx]);
        rotator.style.opacity = '1';
        rotator.style.transform = 'translateY(0)';
      }, 250);
    }
  }, 5000);
}

function updateServerInfoCard(srv) {
  const ipEl = document.getElementById('serverIP');
  const verEl = document.getElementById('serverVersion');
  const typeEl = document.getElementById('serverType');
  const playersEl = document.getElementById('serverPlayersInfo');
  const statusDot = document.getElementById('serverStatusDot');
  const label = document.getElementById('serverInfoLabel');

  if (!srv) {
    if (statusDot) statusDot.innerHTML = '<span style="color:#f87171">●</span> 无服务器';
    return;
  }

  if (label && _serversData.length > 1) {
    label.textContent = `(${_rotateIdx + 1}/${_serversData.length}) ${srv.server_name}`;
  } else if (label) {
    label.textContent = srv.server_name;
  }

  if (ipEl) {
    ipEl.textContent = srv.address;
    ipEl.setAttribute('data-ip', srv.address);
  }

  if (verEl) verEl.textContent = srv.version || '—';
  if (typeEl) typeEl.textContent = srv.server_type || srv.software || '—';

  if (srv.online) {
    if (playersEl) playersEl.textContent = `${srv.players.online} / ${srv.players.max}`;
    if (statusDot) statusDot.innerHTML = '<span style="color:#4ade80">●</span> 在线';
  } else {
    if (playersEl) playersEl.textContent = '—';
    if (statusDot) statusDot.innerHTML = '<span style="color:#f87171">●</span> 离线';
  }

  // 添加过渡动画样式
  const rotator = document.getElementById('serverInfoRotator');
  if (rotator) {
    rotator.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  }
}

/* ---------- 加载最新公告 ---------- */
async function loadLatestAnnouncements() {
  try {
    const res = await fetch(HXZD.API + '/announcements/latest?limit=3');
    const data = await res.json();
    const wrap = document.getElementById('newsList');
    if (!wrap) return;
    if (!data || data.length === 0) {
      wrap.innerHTML = '<li>暂无公告</li>';
      return;
    }

    wrap.innerHTML = data.map(a => `
      <li>
        ${a.is_pinned ? '<span style="color:var(--sao-gold)">📌</span> ' : ''}
        <a href="announcements.html" style="color:var(--sao-text);text-decoration:none">${HXZD.escapeHtml(a.title)}</a>
        <small style="float:right;opacity:0.6">${HXZD.formatDate(a.created_at)}</small>
      </li>
    `).join('');
  } catch (e) {
    console.error('Failed to load announcements:', e);
  }
}

/* ---------- 数字递增动画 ---------- */
function animateCount(el, target) {
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.floor(target / 30));
  const interval = setInterval(() => {
    current += step;
    if (current >= target) {
      current = target;
      clearInterval(interval);
    }
    el.textContent = current;
  }, 30);
}

/* ---------- 复制服务器 IP ---------- */
function copyIP() {
  const ipEl = document.getElementById('serverIP');
  const ip = (ipEl && ipEl.getAttribute('data-ip')) || 'play.hxzd.com';
  navigator.clipboard.writeText(ip).then(() => {
    if (ipEl) {
      ipEl.classList.add('copied');
      HXZD.toast('服务器地址已复制到剪贴板');
      setTimeout(() => ipEl.classList.remove('copied'), 2000);
    }
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = ip;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    HXZD.toast('服务器地址已复制到剪贴板');
  });
}

window.copyIP = copyIP;

/* ---------- 背景音乐开关 ---------- */
function initAudioToggle() {
  const btn = document.getElementById('audioToggle');
  if (!btn) return;

  let audio = null;
  let playing = false;

  btn.addEventListener('click', () => {
    if (!audio) {
      audio = new Audio();
      audio.src = 'assets/bgm.mp3';
      audio.loop = true;
      audio.volume = 0.3;
    }

    if (playing) {
      audio.pause();
      btn.classList.remove('playing');
      btn.textContent = '♪';
    } else {
      audio.play().catch(() => {
        HXZD.toast('请先与页面互动以启用音频');
      });
      btn.classList.add('playing');
      btn.textContent = '♫';
    }
    playing = !playing;
  });
}
