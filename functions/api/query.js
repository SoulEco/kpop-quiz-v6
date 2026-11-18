export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    const { password, code } = body;

    if (password !== '#%Dgs4w') {
      return new Response(JSON.stringify({ error: '密码错误' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    if (code) {
      const key = `CODE_${code.toUpperCase().trim()}`;
      const data = await env.MY_KV.get(key, { type: 'json' });
      if (!data) return new Response(JSON.stringify({ error: '未找到该授权码' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

      return new Response(JSON.stringify({
        success: true, type: 'single',
        data: { code: code.toUpperCase(), max: data.max_attempts, used: data.used_attempts, remaining: data.max_attempts - data.used_attempts, created: data.created_at ? new Date(data.created_at).toLocaleString('zh-CN') : '未知' }
      }), { headers: { 'Content-Type': 'application/json' } });
    } else {
      const list = await env.MY_KV.list({ prefix: 'CODE_', limit: 200 });
      const results = [];
      for (const key of list.keys) {
        const data = await env.MY_KV.get(key.name, { type: 'json' });
        if (data) results.push({ code: key.name.replace('CODE_', ''), max: data.max_attempts, used: data.used_attempts, remaining: data.max_attempts - data.used_attempts, created: data.created_at ? new Date(data.created_at).toLocaleString('zh-CN') : '未知' });
      }
      results.sort((a, b) => new Date(b.created) - new Date(a.created));
      return new Response(JSON.stringify({ success: true, type: 'all', list: results }), { headers: { 'Content-Type': 'application/json' } });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: '服务器查询失败: ' + e.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}