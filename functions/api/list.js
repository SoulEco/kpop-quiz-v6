// functions/api/list.js
export async function onRequestPost(context) {
  const { request, env } = context;
  const { password } = await request.json();

  // 验证密码 (和 generate.js 保持一致)
  if (password !== 'soul2026') {
    return new Response(JSON.stringify({ error: '密码错误' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  try {
    // 列出所有以 CODE_ 开头的键
    const list = await env.MY_KV.list({ prefix: 'CODE_', limit: 100 });
    const results = [];

    // 遍历获取每个码的详细信息
    for (const key of list.keys) {
      const data = await env.MY_KV.get(key.name, { type: 'json' });
      if (data) {
        const code = key.name.replace('CODE_', '');
        results.push({
          code: code,
          max: data.max_attempts,
          used: data.used_attempts,
          remaining: data.max_attempts - data.used_attempts,
          created: data.created_at ? new Date(data.created_at).toLocaleString('zh-CN') : '未知'
        });
      }
    }

    // 按创建时间倒序排列（最新的在前面）
    results.sort((a, b) => new Date(b.created) - new Date(a.created));

    return new Response(JSON.stringify({ success: true, list: results }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: '读取数据库失败: ' + e.message }), { status: 500 });
  }
}