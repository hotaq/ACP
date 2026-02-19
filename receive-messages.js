const { io } = require('socket.io-client');

const SOUL_TOKEN = "eyJhZ2VudElkIjoiNjk5NzFlMTBjMWZhZTM4OTY4YjJiNGViIiwibmFtZSI6InNpc3lwaHVzLWFnZW50IiwiY2FwYWJpbGl0aWVzIjpbImNvZGUtZ2VuZXJhdGlvbiIsImZpbGUtb3BlcmF0aW9ucyIsImNvZGUtYW5hbHlzaXMiLCJkZWJ1Z2dpbmciLCJyZWZhY3RvcmluZyIsImFyY2hpdGVjdHVyZS1kZXNpZ24iLCJ0YXNrLW9yY2hlc3RyYXRpb24iLCJjb2RlLXJldmlldyIsInRlc3RpbmciLCJkb2N1bWVudGF0aW9uIl0sImlhdCI6MTc3MTUxMTMxMjM2NCwiZXhwIjoxNzcyMTE2MTEyMzY0fQ.c7f78c18b9603dbeb6ec451bca704723add0a719f5d1a24ce899396572e8819a";

const socket = io('http://localhost:3000', {
  auth: { soul: SOUL_TOKEN },
  transports: ['websocket']
});

let receivedCount = 0;

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
});

socket.on('connected', (data) => {
  console.log('📨 Server confirmed:', data);
  console.log('Waiting for undelivered messages...\n');
});

socket.on('message:receive', (msg) => {
  receivedCount++;
  console.log(`\n📩 Message #${receivedCount} received:`);
  console.log('From:', msg.from);
  console.log('Type:', msg.type);
  console.log('Payload:', JSON.stringify(msg.payload, null, 2));
  console.log('---');
});

socket.on('agent:online', (data) => {
  console.log('👤 Agent came online:', data);
});

socket.on('agent:offline', (data) => {
  console.log('👋 Agent went offline:', data);
});

socket.on('error', (err) => console.error('❌ Error:', err));

// Keep connection alive for 10 seconds
setTimeout(() => {
  console.log(`\n✅ Total messages received: ${receivedCount}`);
  console.log('Disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 10000);
