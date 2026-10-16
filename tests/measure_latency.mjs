import https from 'https';
import crypto from 'crypto';
import fs from 'fs';
import { execFileSync } from 'child_process';

const key = '1nrypfioobhi6qduxxlc';
const secret = '0d5xmsdtcnpgoirflt73';
const boardId = 1;

function encodeFrame(data) {
  const payload = Buffer.from(data, 'utf8');
  let header;
  if (payload.length <= 125) {
    header = Buffer.from([0x81, 0x80 | payload.length, 0, 0, 0, 0]);
  } else if (payload.length <= 65535) {
    header = Buffer.alloc(8);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  }
  return Buffer.concat([header, payload]);
}

async function runBenchmark() {
  console.log('=== KANBAN REAL-TIME END-TO-END LATENCY BENCHMARK ===\n');

  return new Promise((resolve, reject) => {
    const req = https.request('https://angora.test:443/app/' + key + '?protocol=7&client=js&version=8.6.0&flash=false', {
      ca: fs.readFileSync('C:/ProgramData/envkit/certs/ca.crt'),
      rejectUnauthorized: true,
      headers: {
        'Connection': 'Upgrade',
        'Upgrade': 'websocket',
        'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==',
        'Sec-WebSocket-Version': '13'
      }
    });

    let currentResolve = null;
    const latencies = [];

    req.on('upgrade', (res, socket, head) => {
      console.log('Browser B WebSocket connected (HTTP 101)');

      socket.on('data', (buf) => {
        const str = buf.toString('utf8');
        const jsonMatch = str.match(/\{.*\}/);
        if (!jsonMatch) return;

        try {
          const msg = JSON.parse(jsonMatch[0]);

          if (msg.event === 'pusher:connection_established') {
            const data = JSON.parse(msg.data);
            const socketId = data.socket_id;
            const channel = 'private-boards.' + boardId;
            const signature = crypto.createHmac('sha256', secret).update(socketId + ':' + channel).digest('hex');
            const auth = key + ':' + signature;
            socket.write(encodeFrame(JSON.stringify({
              event: 'pusher:subscribe',
              data: { channel, auth }
            })));
          } else if (msg.event === 'pusher_internal:subscription_succeeded') {
            console.log('Browser B subscribed to private-boards.' + boardId);
            console.log('Starting 10 latency trials...\n');
            runTrials();
          } else if (msg.event === 'task.updated') {
            if (currentResolve) {
              const cb = currentResolve;
              currentResolve = null;
              cb(Date.now());
            }
          }
        } catch (e) {
          // ignore
        }
      });

      async function runTrials() {
        // Find task id on board 1
        const taskRaw = execFileSync('php', ['artisan', 'tinker', '--execute=echo App\\Models\\KanbanTask::first()?->id ?? 1;']).toString().trim();
        const taskId = parseInt(taskRaw, 10) || 1;

        // 1. Run 10 sequential trials
        for (let i = 1; i <= 10; i++) {
          const t0 = Date.now();
          const waitPromise = new Promise((r) => { currentResolve = r; });

          // Dispatch event from Browser A via SafeBroadcast on realtime queue
          execFileSync('php', ['artisan', 'tinker', `--execute=use App\\Support\\SafeBroadcast; use App\\Events\\TaskUpdatedEvent; use App\\Models\\KanbanTask; SafeBroadcast::dispatch(new TaskUpdatedEvent(KanbanTask::find(${taskId}), 'status_changed', 999));`]);

          const t1 = await waitPromise;
          const latencyMs = t1 - t0;
          latencies.push(latencyMs);
          console.log(`Trial ${i.toString().padStart(2, ' ')}: Event delivered to Browser B in ${latencyMs} ms`);

          await new Promise((r) => setTimeout(r, 100));
        }

        const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1);
        const min = Math.min(...latencies);
        const max = Math.max(...latencies);

        console.log(`\n--- Sequential Trials Summary ---`);
        console.log(`Min: ${min} ms | Max: ${max} ms | Average: ${avg} ms\n`);

        // 2. Test 3 simultaneous card movements
        console.log('Testing 3 simultaneous card movements...');
        const simStart = Date.now();
        let receivedCount = 0;
        const simPromise = new Promise((r) => {
          const checkCount = () => {
            receivedCount++;
            if (receivedCount >= 3) {
              r(Date.now());
            } else {
              currentResolve = checkCount;
            }
          };
          currentResolve = checkCount;
        });

        execFileSync('php', ['artisan', 'tinker', `--execute=use App\\Support\\SafeBroadcast; use App\\Events\\TaskUpdatedEvent; use App\\Models\\KanbanTask; for ($j=0; $j<3; $j++) { SafeBroadcast::dispatch(new TaskUpdatedEvent(KanbanTask::find(${taskId}), 'status_changed', 999)); }`]);

        const simEnd = await simPromise;
        const totalSimTime = simEnd - simStart;
        console.log(`All 3 simultaneous events delivered in ${totalSimTime} ms (average ${(totalSimTime / 3).toFixed(1)} ms per event)\n`);

        socket.end();
        resolve({ min, max, avg, latencies, totalSimTime });
      }
    });

    req.on('error', reject);
    req.end();
  });
}

runBenchmark().then(() => {
  console.log('Benchmark finished successfully.');
  process.exit(0);
}).catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
