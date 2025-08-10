let token = null; // 若后端返回 token，会保存并附带到后续请求

const $ = (id) => document.getElementById(id);
const show = (id, on) => ($(id).style.display = on ? 'block' : 'none');
const say = (id, t='') => ($(id).textContent = t);

// 统一封装 fetch（自动带 cookie、token）
async function api(path, options = {}) {
  const headers = { ...(options.headers || {}), 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(path, {
    credentials: 'include',    // 关键：携带 HttpOnly Cookie
    ...options,
    headers
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || res.statusText);
  return data;
}

// 1) 登录
$('login-btn').addEventListener('click', async () => {
  try {
    say('auth-msg', 'Logging in...');
    const email = $('login-email').value.trim();
    const password = $('login-password').value.trim();

    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    // 兼容：若后端返回 token 就存起来；仅用 Cookie 也OK
    if (data.token) token = data.token;

    say('auth-msg', 'Login success ✔');
    show('auth', false);
    show('after-login', true);
  } catch (e) {
    say('auth-msg', e.message || 'Login failed');
  }
});

// 2) 获取交易列表
$('btn-load').addEventListener('click', async () => {
  try {
    say('api-msg', 'Loading transactions...');
    const list = await api('/api/transactions'); // GET

    const ul = $('tx-list');
    ul.innerHTML = '';
    (list || []).forEach(t => {
      const li = document.createElement('li');
      const d = new Date(t.date).toISOString().slice(0,10);
      li.textContent = `${d} | ${t.type} | ${t.amount} | ${t.category} | ${t.note || ''}`;
      ul.appendChild(li);
    });
    say('api-msg', `Loaded ${list.length} items ✔`);
  } catch (e) {
    say('api-msg', e.message || 'Load failed');
  }
});

// 3) 新增一条交易（便于验证 POST 受保护接口）
$('btn-add').addEventListener('click', async () => {
  try {
    const now = new Date();
    const body = {
      date: now.toISOString().slice(0,10),
      amount: -9.9,
      type: 'expense',
      category: 'Test',
      note: 'API smoke test'
    };
    await api('/api/transactions', { method: 'POST', body: JSON.stringify(body) });
    say('api-msg', 'Added 1 test transaction ✔');
  } catch (e) {
    say('api-msg', e.message || 'Add failed');
  }
});
