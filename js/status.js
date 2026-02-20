/* ============================================
   HXZD Status Page — 服务器状态（多服务器）
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  HXZD.initNav();
  HXZD.loadBackground();
  loadAllStatus();
  loadEmbedConfig();
  setInterval(loadAllStatus, 60000);
});

async function loadAllStatus() {
  try {
    const res = await fetch(HXZD.API + '/server-status');
    const data = await res.json();

    const servers = data.servers || [];
    const totalOnline = data.total_online || 0;
    const totalMax = data.total_max || 0;

    // 总览
    document.getElementById('totalOnline').textContent = totalOnline;
    document.getElementById('totalMax').textContent = totalMax;
    document.getElementById('totalServers').textContent = servers.length;

    // 服务器卡片
    const grid = document.getElementById('serversGrid');
    if (servers.length === 0) {
      grid.innerHTML = '<div class="loading-placeholder">暂未配置服务器</div>';
      return;
    }

    grid.innerHTML = servers.map(srv => {
      const statusClass = srv.online ? 'online' : 'offline';
      const statusText = srv.online ? '在线' : '离线';
      const statusColor = srv.online ? 'var(--sao-success)' : 'var(--sao-danger)';

      let playerListHTML = '';
      if (srv.online && srv.players.list && srv.players.list.length > 0) {
        playerListHTML = `
          <div class="status-player-list" style="margin-top:16px;padding-top:16px;border-top:1px solid var(--sao-panel-border)">
            <h4 style="color:var(--sao-accent);font-size:0.85rem;margin-bottom:10px">在线玩家</h4>
            <div>${srv.players.list.map(p =>
              `<span style="display:inline-block;padding:3px 10px;margin:3px;border:1px solid var(--sao-panel-border);border-radius:2px;font-size:0.8rem;color:var(--sao-text)">${HXZD.escapeHtml(p.name)}</span>`
            ).join('')}</div>
          </div>`;
      }

      const iconHTML = srv.icon
        ? `<img src="${srv.icon}" alt="icon" style="width:48px;height:48px;border-radius:4px;image-rendering:pixelated">`
        : `<div style="width:48px;height:48px;border-radius:4px;background:rgba(100,200,255,0.1);display:flex;align-items:center;justify-content:center;font-size:1.5rem">🖥️</div>`;

      return `
        <div class="sao-panel status-card" style="margin-bottom:16px">
          <div class="sao-panel-header">
            <span class="sao-panel-diamond"></span>
            <span>${HXZD.escapeHtml(srv.server_name)}</span>
          </div>
          <div class="status-card-body">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px">
              ${iconHTML}
              <div>
                <div style="font-size:1.05rem;font-weight:600;color:#fff">${HXZD.escapeHtml(srv.server_name)}</div>
                <div style="font-size:0.78rem;color:var(--sao-text-muted)">${HXZD.escapeHtml(srv.address)}</div>
              </div>
              <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
                <span class="status-dot ${statusClass}"></span>
                <span style="color:${statusColor};font-weight:600">${statusText}</span>
              </div>
            </div>
            <div class="status-details">
              <div class="status-row"><span>MOTD</span><span>${srv.motd_html || HXZD.escapeHtml(srv.motd || '—')}</span></div>
              <div class="status-row"><span>版本</span><span>${HXZD.escapeHtml(srv.version || '—')}</span></div>
              <div class="status-row"><span>软件</span><span>${HXZD.escapeHtml(srv.software || '—')}</span></div>
              <div class="status-row"><span>在线玩家</span><span>${srv.online ? `${srv.players.online} / ${srv.players.max}` : '—'}</span></div>
            </div>
            ${playerListHTML}
          </div>
        </div>
      `;
    }).join('');

  } catch (e) {
    console.error('Failed to load server status:', e);
    document.getElementById('serversGrid').innerHTML = '<div class="loading-placeholder">加载失败</div>';
  }
}

async function loadEmbedConfig() {
  try {
    const res = await fetch(HXZD.API + '/server-status/config');
    const cfg = await res.json();
    if (cfg.embed_url) {
      const panel = document.getElementById('embedPanel');
      const iframe = document.getElementById('statusEmbed');
      panel.style.display = 'block';
      iframe.src = cfg.embed_url;
    }
  } catch (e) {
    // 嵌入页面加载失败不影响
  }
}
