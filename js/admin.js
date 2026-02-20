/* ============================================
   HXZD Admin Panel — 管理面板逻辑
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  HXZD.loadBackground();

  if (!HXZD.isLoggedIn() || !HXZD.isAdmin()) {
    alert('需要管理员登录');
    location.href = 'login.html';
    return;
  }

  initAdminNav();
  loadDashboard();
});

// ===== 导航切换 =====
function initAdminNav() {
  document.querySelectorAll('.admin-nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.admin-nav-item').forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
      document.getElementById('sec-' + item.dataset.section).classList.add('active');

      const loaders = {
        dashboard: loadDashboard,
        announcements: loadAnnouncements,
        forum: loadForumAdmin,
        users: loadUsers,
        pages: loadPages,
        settings: loadSettings,
        servers: loadServersAdmin,
        worldmaps: loadWorldMapsAdmin,
        serverstatus: loadServerStatusConfig,
      };
      (loaders[item.dataset.section] || (() => {}))();
    });
  });
}

// ===== 总览 =====
async function loadDashboard() {
  try {
    const [usersRes, annRes, forumRes, statusRes] = await Promise.all([
      HXZD.authFetch('/admin/users'),
      fetch(HXZD.API + '/announcements'),
      fetch(HXZD.API + '/forum/posts'),
      fetch(HXZD.API + '/server-status'),
    ]);
    const users = await usersRes.json();
    const anns = await annRes.json();
    const forum = await forumRes.json();
    const status = await statusRes.json();

    document.getElementById('statUsers').textContent = Array.isArray(users) ? users.length : 0;
    document.getElementById('statAnnouncements').textContent = Array.isArray(anns) ? anns.length : 0;
    document.getElementById('statPosts').textContent = forum.total || 0;
    document.getElementById('statOnline').textContent = `${status.total_online || 0}/${status.total_max || 0}`;
  } catch (e) {
    console.error(e);
  }
}

// ===== 公告管理 =====
async function loadAnnouncements() {
  try {
    const res = await fetch(HXZD.API + '/announcements');
    const data = await res.json();
    const wrap = document.getElementById('announcementsTable');
    if (!data || data.length === 0) {
      wrap.innerHTML = '<p style="color:var(--sao-text-muted);padding:20px">暂无公告</p>';
      return;
    }
    wrap.innerHTML = `<table class="admin-table"><thead><tr>
      <th>ID</th><th>标题</th><th>置顶</th><th>时间</th><th>操作</th>
    </tr></thead><tbody>${data.map(a => `<tr>
      <td>${a.id}</td><td>${esc(a.title)}</td>
      <td>${a.is_pinned ? '📌' : '—'}</td>
      <td>${HXZD.formatDate(a.created_at)}</td>
      <td class="actions">
        <button onclick="toggleAnnPin(${a.id}, ${!a.is_pinned})">${a.is_pinned ? '取消置顶' : '置顶'}</button>
        <button onclick="editAnnouncement(${a.id})">编辑</button>
        <button class="btn-del" onclick="deleteAnnouncement(${a.id})">删除</button>
      </td>
    </tr>`).join('')}</tbody></table>`;
  } catch (e) {
    document.getElementById('announcementsTable').innerHTML = '<p style="color:var(--sao-danger)">加载失败</p>';
  }
}

function showAnnouncementForm(data) {
  document.getElementById('announcementFormArea').style.display = 'block';
  document.getElementById('annEditId').value = data ? data.id : '';
  document.getElementById('annTitle').value = data ? data.title : '';
  document.getElementById('annContent').value = data ? data.content : '';
  document.getElementById('annPinned').checked = data ? data.is_pinned : false;
}

function hideAnnouncementForm() {
  document.getElementById('announcementFormArea').style.display = 'none';
}

async function editAnnouncement(id) {
  const res = await fetch(HXZD.API + `/announcements/${id}`);
  const data = await res.json();
  showAnnouncementForm(data);
}

async function saveAnnouncement() {
  const id = document.getElementById('annEditId').value;
  const body = {
    title: document.getElementById('annTitle').value,
    content: document.getElementById('annContent').value,
    is_pinned: document.getElementById('annPinned').checked,
  };
  const url = id ? `/admin/announcements/${id}` : '/admin/announcements';
  const method = id ? 'PUT' : 'POST';
  await HXZD.authFetch(url, { method, body });
  hideAnnouncementForm();
  loadAnnouncements();
  HXZD.toast('已保存');
}

async function deleteAnnouncement(id) {
  if (!confirm('确定删除？')) return;
  await HXZD.authFetch(`/admin/announcements/${id}`, { method: 'DELETE' });
  loadAnnouncements();
  HXZD.toast('已删除');
}

async function toggleAnnPin(id, pin) {
  await HXZD.authFetch(`/admin/announcements/${id}`, { method: 'PUT', body: { is_pinned: pin } });
  loadAnnouncements();
  HXZD.toast(pin ? '已置顶' : '已取消置顶');
}

// ===== 论坛管理 =====
async function loadForumAdmin() {
  try {
    const res = await fetch(HXZD.API + '/forum/posts?size=50');
    const data = await res.json();
    const wrap = document.getElementById('forumTable');
    if (!data.posts || data.posts.length === 0) {
      wrap.innerHTML = '<p style="color:var(--sao-text-muted);padding:20px">暂无帖子</p>';
      return;
    }
    wrap.innerHTML = `<table class="admin-table"><thead><tr>
      <th>ID</th><th>标题</th><th>作者</th><th>分类</th><th>浏览</th><th>置顶</th><th>操作</th>
    </tr></thead><tbody>${data.posts.map(p => `<tr>
      <td>${p.id}</td><td>${esc(p.title)}</td>
      <td>${esc(p.author?.username || '—')}</td>
      <td>${p.category}</td><td>${p.view_count}</td>
      <td>${p.is_pinned ? '📌' : '—'}</td>
      <td class="actions">
        <button onclick="togglePin(${p.id}, ${!p.is_pinned})">${p.is_pinned ? '取消置顶' : '置顶'}</button>
        <button class="btn-del" onclick="adminDeletePost(${p.id})">删除</button>
      </td>
    </tr>`).join('')}</tbody></table>`;
  } catch (e) {
    document.getElementById('forumTable').innerHTML = '<p style="color:var(--sao-danger)">加载失败</p>';
  }
}

async function togglePin(id, pin) {
  await HXZD.authFetch(`/forum/posts/${id}`, { method: 'PUT', body: { is_pinned: pin } });
  loadForumAdmin();
}

async function adminDeletePost(id) {
  if (!confirm('确定删除此帖子？')) return;
  await HXZD.authFetch(`/forum/posts/${id}`, { method: 'DELETE' });
  loadForumAdmin();
  HXZD.toast('已删除');
}

// ===== 用户管理 =====
async function loadUsers() {
  try {
    const res = await HXZD.authFetch('/admin/users');
    const users = await res.json();
    const wrap = document.getElementById('usersTable');
    wrap.innerHTML = `<table class="admin-table"><thead><tr>
      <th>ID</th><th>用户名</th><th>邮箱</th><th>MC ID</th><th>角色</th><th>注册时间</th><th>操作</th>
    </tr></thead><tbody>${users.map(u => `<tr>
      <td>${u.id}</td><td>${esc(u.username)}</td>
      <td>${esc(u.email || '—')}</td>
      <td>${esc(u.minecraft_id || '—')}</td>
      <td><span class="profile-role ${u.role}" style="font-size:0.7rem">${u.role}</span></td>
      <td>${HXZD.formatDate(u.created_at)}</td>
      <td class="actions">
        <button onclick="toggleRole(${u.id}, '${u.role === 'admin' ? 'user' : 'admin'}')">${u.role === 'admin' ? '降为用户' : '升为管理'}</button>
        <button onclick="resetUserPwd(${u.id})">重置密码</button>
        <button class="btn-del" onclick="deleteUser(${u.id})">删除</button>
      </td>
    </tr>`).join('')}</tbody></table>`;
  } catch (e) {
    document.getElementById('usersTable').innerHTML = '<p style="color:var(--sao-danger)">加载失败</p>';
  }
}

async function toggleRole(id, newRole) {
  await HXZD.authFetch(`/admin/users/${id}/role`, { method: 'PUT', body: { role: newRole } });
  loadUsers();
  HXZD.toast('角色已更新');
}

async function resetUserPwd(id) {
  const pwd = prompt('输入新密码（至少6位）：');
  if (!pwd || pwd.length < 6) { alert('密码至少6位'); return; }
  await HXZD.authFetch(`/admin/users/${id}/password`, { method: 'PUT', body: { new_password: pwd } });
  HXZD.toast('密码已重置');
}

async function deleteUser(id) {
  if (!confirm('确定删除此用户？')) return;
  const res = await HXZD.authFetch(`/admin/users/${id}`, { method: 'DELETE' });
  const data = await res.json();
  if (!res.ok) { alert(data.error); return; }
  loadUsers();
  HXZD.toast('已删除');
}

// ===== 页面管理 =====
async function loadPages() {
  try {
    const res = await HXZD.authFetch('/admin/pages');
    const pages = await res.json();
    const wrap = document.getElementById('pagesEditor');
    wrap.innerHTML = pages.map(p => `
      <div class="page-editor-card">
        <h3>📄 ${esc(p.title || p.slug)} <small style="color:var(--sao-text-muted);font-weight:400">(${p.slug})</small></h3>
        <div class="sao-input-group"><label>页面标题</label><input type="text" id="pageTitle_${p.slug}" value="${esc(p.title || '')}"></div>
        <div class="sao-input-group"><label>内容 (HTML)</label><textarea id="pageContent_${p.slug}">${esc(p.content || '')}</textarea></div>
        <button class="sao-submit-btn btn-small" onclick="savePage('${p.slug}')">保存</button>
      </div>
    `).join('');
  } catch (e) {
    document.getElementById('pagesEditor').innerHTML = '<p style="color:var(--sao-danger)">加载失败</p>';
  }
}

async function savePage(slug) {
  const title = document.getElementById(`pageTitle_${slug}`).value;
  const content = document.getElementById(`pageContent_${slug}`).value;
  await HXZD.authFetch(`/admin/pages/${slug}`, { method: 'PUT', body: { title, content } });
  HXZD.toast('页面已保存');
}

// ===== 网站设置 =====
async function loadSettings() {
  try {
    const res = await fetch(HXZD.API + '/settings');
    const s = await res.json();
    document.getElementById('setMainTitle').value = s.main_title || '';
    document.getElementById('setSiteTitle').value = s.site_title || '';
    document.getElementById('setSubtitle').value = s.site_subtitle || '';
    document.getElementById('setDescription').value = s.site_description || '';
    document.getElementById('setBgUrl').value = s.background_url || '';
    document.getElementById('setFaviconUrl').value = s.favicon_url || '';
    document.getElementById('setFooterText').value = s.footer_text || '';
    // 同步 admin 侧边栏标题和页面 title
    const mainTitle = s.main_title || 'HXZD';
    const logoEl = document.querySelector('.admin-logo .glitch-text-sm');
    if (logoEl) { logoEl.textContent = mainTitle; logoEl.setAttribute('data-text', mainTitle); }
    document.title = `管理面板 - ${mainTitle}`;
  } catch (e) {}
}

async function saveSettings() {
  const body = {
    main_title: document.getElementById('setMainTitle').value,
    site_title: document.getElementById('setSiteTitle').value,
    site_subtitle: document.getElementById('setSubtitle').value,
    site_description: document.getElementById('setDescription').value,
    background_url: document.getElementById('setBgUrl').value,
    favicon_url: document.getElementById('setFaviconUrl').value,
    footer_text: document.getElementById('setFooterText').value,
  };
  await HXZD.authFetch('/admin/settings', { method: 'PUT', body });
  HXZD.toast('设置已保存');
  HXZD.loadBackground();
}

// ===== 服务器管理 (多服务器 CRUD) =====
async function loadServersAdmin() {
  try {
    const [srvRes, statusRes] = await Promise.all([
      HXZD.authFetch('/admin/servers'),
      fetch(HXZD.API + '/server-status'),
    ]);
    const servers = await srvRes.json();
    const statusData = await statusRes.json();
    const statusMap = {};
    (statusData.servers || []).forEach(s => { statusMap[s.server_id] = s; });

    const wrap = document.getElementById('serversTable');
    if (!servers || servers.length === 0) {
      wrap.innerHTML = '<p style="color:var(--sao-text-muted);padding:20px">暂无服务器，请点击"添加服务器"</p>';
      return;
    }

    wrap.innerHTML = `<table class="admin-table"><thead><tr>
      <th>ID</th><th>名称</th><th>地址</th><th>类型</th><th>排序</th><th>启用</th><th>状态</th><th>玩家</th><th>操作</th>
    </tr></thead><tbody>${servers.map(s => {
      const st = statusMap[s.id];
      const online = st && st.online;
      return `<tr>
        <td>${s.id}</td>
        <td>${esc(s.name)}</td>
        <td style="font-family:monospace;font-size:0.8rem">${esc(s.address)}</td>
        <td>${esc(s.server_type || '—')}</td>
        <td>${s.sort_order}</td>
        <td>${s.enabled ? '<span style="color:var(--sao-success)">✓</span>' : '<span style="color:var(--sao-danger)">✗</span>'}</td>
        <td><span style="color:${online ? 'var(--sao-success)' : 'var(--sao-danger)'}">${online ? '● 在线' : '● 离线'}</span></td>
        <td>${online ? `${st.players.online}/${st.players.max}` : '—'}</td>
        <td class="actions">
          <button onclick="editServer(${s.id})">编辑</button>
          <button class="btn-del" onclick="deleteServer(${s.id})">删除</button>
        </td>
      </tr>`;
    }).join('')}</tbody></table>`;
  } catch (e) {
    document.getElementById('serversTable').innerHTML = '<p style="color:var(--sao-danger)">加载失败</p>';
  }
}

function showAddServerForm() {
  document.getElementById('serverFormArea').style.display = 'block';
  document.getElementById('srvEditId').value = '';
  document.getElementById('srvName').value = '';
  document.getElementById('srvAddress').value = '';
  document.getElementById('srvServerType').value = '';
  document.getElementById('srvSort').value = '0';
  document.getElementById('srvEnabled').checked = true;
}

function hideServerForm() {
  document.getElementById('serverFormArea').style.display = 'none';
}

async function editServer(id) {
  const res = await HXZD.authFetch('/admin/servers');
  const servers = await res.json();
  const srv = servers.find(s => s.id === id);
  if (!srv) return;

  document.getElementById('serverFormArea').style.display = 'block';
  document.getElementById('srvEditId').value = srv.id;
  document.getElementById('srvName').value = srv.name;
  document.getElementById('srvAddress').value = srv.address;
  document.getElementById('srvServerType').value = srv.server_type || '';
  document.getElementById('srvSort').value = srv.sort_order;
  document.getElementById('srvEnabled').checked = srv.enabled;
}

async function saveServer() {
  const id = document.getElementById('srvEditId').value;
  const body = {
    name: document.getElementById('srvName').value,
    address: document.getElementById('srvAddress').value,
    server_type: document.getElementById('srvServerType').value,
    sort_order: parseInt(document.getElementById('srvSort').value) || 0,
    enabled: document.getElementById('srvEnabled').checked,
  };

  if (!body.name || !body.address) {
    HXZD.toast('名称和地址不能为空');
    return;
  }

  if (id) {
    await HXZD.authFetch(`/admin/servers/${id}`, { method: 'PUT', body });
  } else {
    await HXZD.authFetch('/admin/servers', { method: 'POST', body });
  }

  hideServerForm();
  HXZD.toast('服务器已保存');
  // 等待一下再刷新，让后端刷新状态
  setTimeout(loadServersAdmin, 1000);
}

async function deleteServer(id) {
  if (!confirm('确定删除此服务器？')) return;
  await HXZD.authFetch(`/admin/servers/${id}`, { method: 'DELETE' });
  loadServersAdmin();
  HXZD.toast('已删除');
}

async function refreshServers() {
  await HXZD.authFetch('/admin/server-status/refresh', { method: 'POST' });
  HXZD.toast('刷新已触发，请等待几秒后刷新页面');
  setTimeout(loadServersAdmin, 3000);
}

// ===== 监控配置 =====
async function loadServerStatusConfig() {
  try {
    const cfgRes = await HXZD.authFetch('/admin/server-status/config');
    const cfg = await cfgRes.json();
    document.getElementById('ssEmbedURL').value = cfg.embed_url || '';

    // 显示所有服务器状态
    const statusRes = await fetch(HXZD.API + '/server-status');
    const status = await statusRes.json();
    const servers = status.servers || [];

    if (servers.length === 0) {
      document.getElementById('ssCurrentStatus').innerHTML = '<span style="color:var(--sao-text-muted)">暂无服务器</span>';
      return;
    }

    document.getElementById('ssCurrentStatus').innerHTML = servers.map(s => `
      <div style="padding:12px;border:1px solid var(--sao-panel-border);border-radius:2px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
          <span style="width:8px;height:8px;border-radius:50%;background:${s.online ? 'var(--sao-success)' : 'var(--sao-danger)'}"></span>
          <strong style="color:${s.online ? 'var(--sao-success)' : 'var(--sao-danger)'}">${esc(s.server_name)}</strong>
          <span style="font-size:0.75rem;color:var(--sao-text-muted)">${esc(s.address)}</span>
        </div>
        <div style="font-size:0.82rem;color:var(--sao-text)">
          版本: ${esc(s.version || '—')} · 
          玩家: ${s.online ? `${s.players.online}/${s.players.max}` : '—'} · 
          MOTD: ${esc(s.motd || '—')}
        </div>
      </div>
    `).join('') + `
      <div style="margin-top:12px;font-size:0.85rem;color:var(--sao-accent)">
        总在线: ${status.total_online || 0} / 总最大: ${status.total_max || 0}
      </div>
    `;
  } catch (e) {
    document.getElementById('ssCurrentStatus').innerHTML = '<span style="color:var(--sao-text-muted)">加载失败</span>';
  }
}

async function saveServerStatusConfig() {
  const body = {
    embed_url: document.getElementById('ssEmbedURL').value,
  };
  await HXZD.authFetch('/admin/server-status/config', { method: 'PUT', body });
  HXZD.toast('配置已保存');
  loadServerStatusConfig();
}

// ===== 世界地图管理 =====
async function loadWorldMapsAdmin() {
  try {
    const res = await HXZD.authFetch('/admin/world-maps');
    const maps = await res.json();
    const wrap = document.getElementById('mapsTable');
    if (!maps || maps.length === 0) {
      wrap.innerHTML = '<p style="color:var(--sao-text-muted);padding:20px">暂无地图，请点击“添加地图”</p>';
      return;
    }
    wrap.innerHTML = `<table class="admin-table"><thead><tr>
      <th>ID</th><th>名称</th><th>嵌入 URL</th><th>排序</th><th>启用</th><th>操作</th>
    </tr></thead><tbody>${maps.map(m => `<tr>
      <td>${m.id}</td>
      <td>${esc(m.name)}</td>
      <td style="font-family:monospace;font-size:0.75rem;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.embed_url || '未配置')}</td>
      <td>${m.sort_order}</td>
      <td>${m.enabled ? '<span style="color:var(--sao-success)">✓</span>' : '<span style="color:var(--sao-danger)">✗</span>'}</td>
      <td class="actions">
        <button onclick="editMap(${m.id})">编辑</button>
        <button class="btn-del" onclick="deleteMap(${m.id})">删除</button>
      </td>
    </tr>`).join('')}</tbody></table>`;
  } catch (e) {
    document.getElementById('mapsTable').innerHTML = '<p style="color:var(--sao-danger)">加载失败</p>';
  }
}

function showAddMapForm() {
  document.getElementById('mapFormArea').style.display = 'block';
  document.getElementById('mapEditId').value = '';
  document.getElementById('mapName').value = '';
  document.getElementById('mapEmbedUrl').value = '';
  document.getElementById('mapSort').value = '0';
  document.getElementById('mapEnabled').checked = true;
}

function hideMapForm() {
  document.getElementById('mapFormArea').style.display = 'none';
}

async function editMap(id) {
  const res = await HXZD.authFetch('/admin/world-maps');
  const maps = await res.json();
  const m = maps.find(x => x.id === id);
  if (!m) return;
  document.getElementById('mapFormArea').style.display = 'block';
  document.getElementById('mapEditId').value = m.id;
  document.getElementById('mapName').value = m.name;
  document.getElementById('mapEmbedUrl').value = m.embed_url;
  document.getElementById('mapSort').value = m.sort_order;
  document.getElementById('mapEnabled').checked = m.enabled;
}

async function saveMap() {
  const id = document.getElementById('mapEditId').value;
  const body = {
    name: document.getElementById('mapName').value,
    embed_url: document.getElementById('mapEmbedUrl').value,
    sort_order: parseInt(document.getElementById('mapSort').value) || 0,
    enabled: document.getElementById('mapEnabled').checked,
  };
  if (!body.name) { HXZD.toast('名称不能为空'); return; }
  if (id) {
    await HXZD.authFetch(`/admin/world-maps/${id}`, { method: 'PUT', body });
  } else {
    await HXZD.authFetch('/admin/world-maps', { method: 'POST', body });
  }
  hideMapForm();
  HXZD.toast('地图已保存');
  loadWorldMapsAdmin();
}

async function deleteMap(id) {
  if (!confirm('确定删除此地图？')) return;
  await HXZD.authFetch(`/admin/world-maps/${id}`, { method: 'DELETE' });
  loadWorldMapsAdmin();
  HXZD.toast('已删除');
}

function adminLogout() {
  HXZD.clearAuth();
  location.href = 'login.html';
}

function esc(s) { return HXZD.escapeHtml(s); }
