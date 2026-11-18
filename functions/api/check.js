export async function onRequestPost(context) {
  const { request, env } = context;
  const { code } = await request.json();
  if (!code || code.length !== 6) return new Response(JSON.stringify({ error: '请输入6位授权码' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const key = `CODE_${code.toUpperCase().trim()}`;
  const data = await env.MY_KV.get(key, { type: 'json' });
  if (!data) return new Response(JSON.stringify({ error: '授权码不存在或已过期' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  const remaining = data.max_attempts - data.used_attempts;
  return new Response(JSON.stringify({ 
    valid: true, 
    remaining, 
    has_result: (data.results && data.results.length > 0), 
    results: data.results || [] // 🚨 返回数组
  }), { headers: { 'Content-Type': 'application/json' } });
}