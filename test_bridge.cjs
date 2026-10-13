const http = require('http');

function rpc(method, params = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params });
    const req = http.request({
      hostname: '127.0.0.1',
      port: 9877,
      path: '/rpc',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) reject(parsed.error);
          else resolve(parsed.result);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function test() {
  const comp = await rpc('get_comp');
  console.log('Current comp:', comp ? comp.name : 'none');
}

test().catch(console.error);
