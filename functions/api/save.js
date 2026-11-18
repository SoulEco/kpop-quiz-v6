export async function onRequestPost(context) {
  const { request, env } = context;
  const { code, gen, resultData } = await request.json();

  const key = `CODE_${code.toUpperCase().trim()}`;
  const data = await env.MY_KV.get(key, { type: 'json' });
  if (!data) return new Response(JSON.stringify({ error: '授权码不存在' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

  if (data.used_attempts >= data.max_attempts) {
    return new Response(JSON.stringify({ error: '测试次数已用完，无法再次测试' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  data.used_attempts += 1;
  
  // 🚨 核心修复：兼容旧版数据格式（旧版是对象，新版是数组）
  if (data.results && !Array.isArray(data.results)) {
    // 如果是旧版对象，将其转换为新版数组
    const oldResults = data.results;
    data.results = [];
    for (const genKey in oldResults) {
      data.results.push({
        gen: genKey,
        result: oldResults[genKey],
        timestamp: new Date().toISOString()
      });
    }
  } else if (!data.results) {
    // 如果完全没有 results，初始化为空数组
    data.results = [];
  }

  // 推入本次最新测试结果
  data.results.push({
    gen: gen,
    result: resultData,
    timestamp: new Date().toISOString()
  });

  // 如果超过最大次数，移除最老的记录（保持数组长度 <= max_attempts）
  if (data.results.length > data.max_attempts) {
    data.results.shift();
  }

  await env.MY_KV.put(key, JSON.stringify(data));

  return new Response(JSON.stringify({
    success: true,
    remaining: data.max_attempts - data.used_attempts,
    result: resultData
  }), { headers: { 'Content-Type': 'application/json' } });
}