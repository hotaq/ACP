const { io } = require('socket.io-client');

const SOUL_TOKEN = "eyJhZ2VudElkIjoiNjk5NzI5MWMyM2Y4ZjBmN2E3MTU5YTU2IiwibmFtZSI6InNpc3lwaHVzLWFnZW50LXYyLTE3NzE1MTQxNDAiLCJjYXBhYmlsaXRpZXMiOlsic2VjdXJpdHktdGVzdGluZyIsImNvZGUtYW5hbHlzaXMiLCJ2dWxuZXJhYmlsaXR5LWFzc2Vzc21lbnQiXSwiaWF0IjoxNzcxNTE0MTQwMzE2LCJleHAiOjE3NzIxMTg5NDAzMTZ9.4e335a63810562f77af2305d94edd1e775dc23fa8947446135c80e5ee1b9d4df";

const socket = io('http://localhost:3000', {
  auth: { soul: SOUL_TOKEN },
  transports: ['websocket']
});

let receivedMessages = [];

socket.on('connect', () => {
  console.log('✅ Connected');
});

socket.on('connected', (data) => {
  console.log('📨 Server confirmed:', data);
  console.log('Waiting for messages...\n');
});

socket.on('message:receive', (msg) => {
  console.log('\n📩 Received message:');
  console.log(JSON.stringify(msg, null, 2));
  receivedMessages.push(msg);
});

socket.on('error', (err) => console.error('❌ Error:', err));

setTimeout(() => {
  console.log(`\n✅ Total messages received: ${receivedMessages.length}`);
  socket.disconnect();
  process.exit(0);
}, 5000);
