export async function onRequestPost(context) {
  const { request, env } = context;
  const { password, count = 10, attempts = 1 } = await request.json();

  if (password !== '#%Dgs4w') {
    return new Response(JSON.stringify({ error: '密码错误' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const targetCount = Math.min(parseInt(count) || 10, 100);
  const maxAttempts = parseInt(attempts) || 1;

  const existingCodes = new Set();
  let cursor = null;
  try {
    do {
      const listRes = await env.MY_KV.list({ prefix: 'CODE_', limit: 1000, cursor: cursor });
      listRes.keys.forEach(key => existingCodes.add(key.name.replace('CODE_', '')));
      cursor = listRes.cursor;
    } while (cursor);
  } catch (e) { console.error(e); }

  const newCodesSet = new Set();
  const results = [];
  let safetyCounter = 0;

  while (newCodesSet.size < targetCount && safetyCounter < 10000) {
    let code = '';
    for (let j = 0; j < 6; j++) code += chars.charAt(Math.floor(Math.random() * chars.length));

    if (!existingCodes.has(code) && !newCodesSet.has(code)) {
      newCodesSet.add(code);
      existingCodes.add(code);

      const key = `CODE_${code}`;
      const value = {
        max_attempts: maxAttempts,
        used_attempts: 0,
        results: {}, // 分代存储：{ gen2: {...}, gen3: {...} }
        created_at: new Date().toISOString()
      };

      await env.MY_KV.put(key, JSON.stringify(value), { expirationTtl: 2592000 });
      results.push({ code, max: maxAttempts });
    }
    safetyCounter++;
  }

  return new Response(JSON.stringify({ success: true, codes: results }), { headers: { 'Content-Type': 'application/json' } });
}