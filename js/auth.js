/* ============================================
   HXZD Auth — 登录 / 注册 / 个人资料
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  HXZD.initNav();
  HXZD.loadBackground();
  initAuthPage();
});

function initAuthPage() {
  // Tab 切换
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      document.getElementById('loginForm').style.display = target === 'login' ? 'block' : 'none';
      document.getElementById('registerForm').style.display = target === 'register' ? 'block' : 'none';
      document.getElementById('profileForm').style.display = target === 'profile' ? 'block' : 'none';
      document.getElementById('authTitle').textContent =
        target === 'login' ? 'USER LOGIN' : target === 'register' ? 'USER REGISTER' : 'USER PROFILE';
    });
  });

  // 登录表单
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const errEl = document.getElementById('loginError');
    errEl.textContent = '';

    try {
      const res = await fetch(HXZD.API + '/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.value,
          password: form.password.value,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || '登录失败';
        return;
      }
      HXZD.saveAuth(data.token, data.user);
      HXZD.toast('登录成功！');
      showProfile();
    } catch (err) {
      errEl.textContent = '网络错误';
    }
  });

  // 注册表单
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const errEl = document.getElementById('registerError');
    errEl.textContent = '';

    if (form.password.value !== form.password_confirm.value) {
      errEl.textContent = '两次密码不一致';
      return;
    }

    try {
      const res = await fetch(HXZD.API + '/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: form.username.value,
          password: form.password.value,
          email: form.email.value,
          minecraft_id: form.minecraft_id.value,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        errEl.textContent = data.error || '注册失败';
        return;
      }
      HXZD.saveAuth(data.token, data.user);
      HXZD.toast('注册成功！');
      showProfile();
    } catch (err) {
      errEl.textContent = '网络错误';
    }
  });

  // 如果已登录，直接显示个人资料
  if (HXZD.isLoggedIn()) {
    showProfile();
  }
}

async function showProfile() {
  // 隐藏登录和注册 tab，只显示个人资料
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.remove('active');
    if (t.dataset.tab === 'login' || t.dataset.tab === 'register') {
      t.style.display = 'none';
    }
  });
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('profileForm').style.display = 'block';
  document.getElementById('profileTab').style.display = 'block';
  document.getElementById('profileTab').classList.add('active');
  document.getElementById('authTitle').textContent = 'USER PROFILE';

  // 获取最新用户信息
  try {
    const res = await HXZD.authFetch('/auth/me');
    if (!res.ok) {
      HXZD.clearAuth();
      location.reload();
      return;
    }
    const user = await res.json();
    HXZD.saveAuth(HXZD.getToken(), user);

    document.getElementById('profileUsername').textContent = user.username;
    const roleEl = document.getElementById('profileRole');
    roleEl.textContent = user.role;
    roleEl.className = 'profile-role ' + user.role;

    document.getElementById('profileEmail').value = user.email || '';
    document.getElementById('profileMCID').value = user.minecraft_id || '';

    // 头像优先使用 Minecraft 正版皮肤 (crafatar)
    const avatarEl = document.getElementById('profileAvatar');
    const mcId = user.minecraft_id;
    if (mcId) {
      const skinUrl = `https://mc-heads.net/avatar/${encodeURIComponent(mcId)}/128`;
      avatarEl.innerHTML = `<img src="${HXZD.escapeHtml(skinUrl)}" alt="avatar" onerror="this.parentElement.innerHTML='<span>${user.username.charAt(0).toUpperCase()}</span>'">`;
    } else {
      avatarEl.innerHTML = `<span>${user.username.charAt(0).toUpperCase()}</span>`;
    }

    // 管理员入口
    if (user.role === 'admin') {
      document.getElementById('adminEntryBtn').style.display = 'block';
    }

    HXZD.initNav();
  } catch (e) {
    console.error(e);
  }
}

async function saveProfile() {
  const errEl = document.getElementById('profileError');
  errEl.textContent = '';
  try {
    const mcId = document.getElementById('profileMCID').value;
    const res = await HXZD.authFetch('/auth/profile', {
      method: 'PUT',
      body: {
        email: document.getElementById('profileEmail').value,
        minecraft_id: mcId,
        avatar_url: mcId ? `https://mc-heads.net/avatar/${encodeURIComponent(mcId)}/128` : '',
      },
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || '更新失败';
      return;
    }
    HXZD.saveAuth(HXZD.getToken(), data);
    HXZD.toast('资料已更新');
    showProfile();
  } catch (e) {
    errEl.textContent = '网络错误';
  }
}

async function changePassword() {
  const errEl = document.getElementById('profileError');
  errEl.textContent = '';
  const oldPwd = document.getElementById('oldPassword').value;
  const newPwd = document.getElementById('newPassword').value;
  if (!oldPwd || !newPwd) {
    errEl.textContent = '请填写密码';
    return;
  }
  if (newPwd.length < 6) {
    errEl.textContent = '新密码至少6位';
    return;
  }
  try {
    const res = await HXZD.authFetch('/auth/password', {
      method: 'PUT',
      body: { old_password: oldPwd, new_password: newPwd },
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || '修改失败';
      return;
    }
    HXZD.toast('密码已修改');
    document.getElementById('oldPassword').value = '';
    document.getElementById('newPassword').value = '';
  } catch (e) {
    errEl.textContent = '网络错误';
  }
}

function logout() {
  HXZD.clearAuth();
  HXZD.toast('已退出登录');
  location.reload();
}

// ===== 折叠面板 =====
function toggleSection(sectionId, btn) {
  const section = document.getElementById(sectionId);
  const isOpen = section.classList.contains('open');
  // 关闭所有折叠面板
  document.querySelectorAll('.profile-collapsible').forEach(s => s.classList.remove('open'));
  document.querySelectorAll('.profile-expand-btn').forEach(b => {
    b.classList.remove('expanded');
    b.textContent = b.textContent.replace('▾', '▸');
  });
  // 如果之前是关闭的，则打开
  if (!isOpen) {
    section.classList.add('open');
    if (btn) {
      btn.classList.add('expanded');
      btn.textContent = btn.textContent.replace('▸', '▾');
    }
  }
}

// ===== 修改用户名 =====
async function changeUsername() {
  const errEl = document.getElementById('profileError');
  errEl.textContent = '';
  const newName = document.getElementById('newUsername').value.trim();
  if (!newName) {
    errEl.textContent = '请输入新用户名';
    return;
  }
  if (newName.length < 2 || newName.length > 32) {
    errEl.textContent = '用户名需要2-32个字符';
    return;
  }
  try {
    const res = await HXZD.authFetch('/auth/profile', {
      method: 'PUT',
      body: { username: newName },
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || '修改失败';
      return;
    }
    HXZD.saveAuth(HXZD.getToken(), data);
    HXZD.toast('用户名已修改');
    document.getElementById('newUsername').value = '';
    toggleSection('usernameSection', document.querySelector('[onclick*="usernameSection"]'));
    showProfile();
  } catch (e) {
    errEl.textContent = '网络错误';
  }
}

