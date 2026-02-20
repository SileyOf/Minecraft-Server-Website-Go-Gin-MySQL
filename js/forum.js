/* ============================================
   HXZD Forum — 微论坛交互逻辑
   ============================================ */

let currentPage = 1;
let currentCategory = '';

document.addEventListener('DOMContentLoaded', () => {
  HXZD.initNav();
  HXZD.loadBackground();

  // 如果已登录，显示发帖按钮
  if (HXZD.isLoggedIn()) {
    document.getElementById('newPostBtn').style.display = 'inline-flex';
  }

  // 分类切换
  document.querySelectorAll('.forum-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.forum-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.cat;
      currentPage = 1;
      loadPosts();
    });
  });

  loadPosts();
});

async function loadPosts() {
  const container = document.getElementById('forumPostList');
  container.innerHTML = '<div class="loading-placeholder">加载中...</div>';

  try {
    let url = `/forum/posts?page=${currentPage}&size=15`;
    if (currentCategory) url += `&category=${currentCategory}`;
    const res = await fetch(HXZD.API + url);
    const data = await res.json();

    if (!data.posts || data.posts.length === 0) {
      container.innerHTML = '<div class="loading-placeholder">暂无帖子，快来发第一帖吧！</div>';
      document.getElementById('forumPagination').innerHTML = '';
      return;
    }

    const catLabels = { general: '综合', discussion: '讨论', question: '求助', showcase: '展示', suggestion: '建议', whitelist: '白名单申请' };

    container.innerHTML = data.posts.map(p => `
      <div class="forum-post-item ${p.is_pinned ? 'pinned' : ''}" onclick="viewPost(${p.id})">
        <div class="forum-post-title">
          ${p.is_pinned ? '<span style="color:var(--sao-gold)">📌 </span>' : ''}
          ${HXZD.escapeHtml(p.title)}
        </div>
        <div class="forum-post-meta">
          <span class="forum-post-cat">${catLabels[p.category] || p.category}</span>
          <span>${HXZD.escapeHtml(p.author?.username || '匿名')}</span>
          <span>👁 ${p.view_count || 0}</span>
          <span>${HXZD.formatDate(p.created_at)}</span>
        </div>
      </div>
    `).join('');

    // 分页
    const totalPages = Math.ceil(data.total / data.size);
    const pagEl = document.getElementById('forumPagination');
    if (totalPages <= 1) {
      pagEl.innerHTML = '';
      return;
    }
    let html = '';
    for (let i = 1; i <= totalPages; i++) {
      html += `<button class="${i === currentPage ? 'active' : ''}" onclick="goPage(${i})">${i}</button>`;
    }
    pagEl.innerHTML = html;
  } catch (e) {
    container.innerHTML = '<div class="loading-placeholder">加载失败</div>';
  }
}

function goPage(p) {
  currentPage = p;
  loadPosts();
  window.scrollTo(0, 0);
}

async function viewPost(id) {
  document.getElementById('forumListView').style.display = 'none';
  document.getElementById('newPostFormView').style.display = 'none';
  document.getElementById('forumPostView').style.display = 'block';

  const detailEl = document.getElementById('postDetail');
  const commentsEl = document.getElementById('commentsSection');
  detailEl.innerHTML = '<div class="loading-placeholder">加载中...</div>';
  commentsEl.innerHTML = '';

  try {
    const res = await fetch(HXZD.API + `/forum/posts/${id}`);
    const post = await res.json();
    const user = HXZD.getUser();
    const canDelete = user && (user.id === post.author_id || user.role === 'admin');
    const canEdit = user && (user.id === post.author_id || user.role === 'admin');

    detailEl.innerHTML = `
      <div class="post-header">
        <h2 class="post-title">${HXZD.escapeHtml(post.title)}</h2>
        <div class="post-meta">
          <span>👤 ${HXZD.escapeHtml(post.author?.username || '匿名')}</span>
          <span>📅 ${HXZD.formatDateTime(post.created_at)}</span>
          <span>👁 ${post.view_count}</span>
          ${canEdit ? `<span><button class="sao-submit-btn btn-small" onclick="showEditPost(${post.id})" style="padding:2px 8px;font-size:0.7rem">编辑</button></span>` : ''}
          ${canDelete ? `<span><button class="sao-submit-btn btn-small btn-danger" onclick="deletePost(${post.id})" style="padding:2px 8px;font-size:0.7rem">删除</button></span>` : ''}
        </div>
      </div>
      <div class="post-body" id="postBody">${HXZD.escapeHtml(post.content)}</div>
      <div class="post-edit-form" id="postEditForm" style="display:none;padding:20px">
        <div class="sao-input-group"><label>标题</label><input type="text" id="editPostTitle" value="${HXZD.escapeHtml(post.title)}"></div>
        <div class="sao-input-group"><label>分类</label>
          <select id="editPostCategory" class="sao-select">
            <option value="general" ${post.category==='general'?'selected':''}>综合</option>
            <option value="discussion" ${post.category==='discussion'?'selected':''}>讨论</option>
            <option value="question" ${post.category==='question'?'selected':''}>求助</option>
            <option value="showcase" ${post.category==='showcase'?'selected':''}>展示</option>
            <option value="suggestion" ${post.category==='suggestion'?'selected':''}>建议</option>
            <option value="whitelist" ${post.category==='whitelist'?'selected':''}>白名单申请</option>
          </select>
        </div>
        <div class="sao-input-group"><label>内容</label><textarea id="editPostContent" rows="10">${HXZD.escapeHtml(post.content)}</textarea></div>
        <div style="display:flex;gap:10px">
          <button class="sao-submit-btn btn-small" onclick="submitEditPost(${post.id})">保存修改</button>
          <button class="sao-submit-btn btn-small btn-secondary" onclick="cancelEditPost()">取消</button>
        </div>
      </div>
    `;

    // 评论
    const comments = post.comments || [];
    let commHTML = `
      <div class="sao-panel-header"><span class="sao-panel-diamond"></span><span>COMMENTS (${comments.length})</span></div>
    `;

    comments.forEach(c => {
      const canDelComment = user && (user.id === c.author_id || user.role === 'admin');
      commHTML += `
        <div class="comment-item">
          <div class="comment-author">${HXZD.escapeHtml(c.author?.username || '匿名')}
            ${canDelComment ? `<button onclick="deleteComment(${c.id}, ${id})" style="margin-left:8px;background:none;border:none;color:var(--sao-danger);cursor:pointer;font-size:0.7rem">删除</button>` : ''}
          </div>
          <div class="comment-body">${HXZD.escapeHtml(c.content)}</div>
          <div class="comment-time">${HXZD.formatDateTime(c.created_at)}</div>
        </div>
      `;
    });

    if (HXZD.isLoggedIn()) {
      commHTML += `
        <div class="comment-form">
          <textarea id="commentInput" placeholder="写下你的评论..."></textarea>
          <button class="sao-submit-btn btn-small" onclick="submitComment(${id})">发送</button>
        </div>
      `;
    }

    commentsEl.innerHTML = commHTML;
  } catch (e) {
    detailEl.innerHTML = '<div class="loading-placeholder">加载失败</div>';
  }
}

async function submitComment(postId) {
  const input = document.getElementById('commentInput');
  const content = input.value.trim();
  if (!content) return;

  try {
    const res = await HXZD.authFetch(`/forum/posts/${postId}/comments`, {
      method: 'POST',
      body: { content },
    });
    if (res.ok) {
      input.value = '';
      viewPost(postId);
    } else {
      const data = await res.json();
      HXZD.toast(data.error || '评论失败');
    }
  } catch (e) {
    HXZD.toast('网络错误');
  }
}

async function deletePost(id) {
  if (!confirm('确定要删除这篇帖子吗？')) return;
  try {
    await HXZD.authFetch(`/forum/posts/${id}`, { method: 'DELETE' });
    HXZD.toast('已删除');
    backToList();
  } catch (e) {
    HXZD.toast('删除失败');
  }
}

async function deleteComment(commentId, postId) {
  if (!confirm('确定删除此评论？')) return;
  try {
    await HXZD.authFetch(`/forum/comments/${commentId}`, { method: 'DELETE' });
    viewPost(postId);
  } catch (e) {
    HXZD.toast('删除失败');
  }
}

function showNewPostForm() {
  document.getElementById('forumListView').style.display = 'none';
  document.getElementById('forumPostView').style.display = 'none';
  document.getElementById('newPostFormView').style.display = 'block';
}

// ===== 编辑帖子 =====
function showEditPost() {
  document.getElementById('postBody').style.display = 'none';
  document.getElementById('postEditForm').style.display = 'block';
}

function cancelEditPost() {
  document.getElementById('postBody').style.display = '';
  document.getElementById('postEditForm').style.display = 'none';
}

async function submitEditPost(id) {
  const title = document.getElementById('editPostTitle').value.trim();
  const content = document.getElementById('editPostContent').value.trim();
  const category = document.getElementById('editPostCategory').value;
  if (!title || !content) { HXZD.toast('标题和内容不能为空'); return; }
  try {
    const res = await HXZD.authFetch(`/forum/posts/${id}`, {
      method: 'PUT',
      body: { title, content, category },
    });
    if (res.ok) {
      HXZD.toast('修改成功');
      viewPost(id);
    } else {
      const data = await res.json();
      HXZD.toast(data.error || '修改失败');
    }
  } catch (e) {
    HXZD.toast('网络错误');
  }
}

async function submitNewPost(e) {
  e.preventDefault();
  const form = e.target;
  try {
    const res = await HXZD.authFetch('/forum/posts', {
      method: 'POST',
      body: {
        title: form.title.value,
        content: form.content.value,
        category: form.category.value,
      },
    });
    if (res.ok) {
      HXZD.toast('发布成功！');
      form.reset();
      backToList();
    } else {
      const data = await res.json();
      HXZD.toast(data.error || '发布失败');
    }
  } catch (e) {
    HXZD.toast('网络错误');
  }
}

function backToList() {
  document.getElementById('forumListView').style.display = 'block';
  document.getElementById('forumPostView').style.display = 'none';
  document.getElementById('newPostFormView').style.display = 'none';
  loadPosts();
}
