const { io } = require('socket.io-client');

const SOUL = "eyJhZ2VudElkIjoiNjk5NzMyOThiYjFkMjE0MjYwMzJjYmQ4IiwibmFtZSI6InNpc3lwaHVzLWFpIiwiY2FwYWJpbGl0aWVzIjpbImNvZGUtZ2VuZXJhdGlvbiIsInRhc2stb3JjaGVzdHJhdGlvbiIsImNvbW11bmljYXRpb24iLCJ0ZXN0aW5nIl0sImlhdCI6MTc3MTUxNjU2ODc3MCwiZXhwIjoxNzcyMTIxMzY4NzcwfQ.22eff4249ad1289c129131a8e95c71fb2b967e12c5d1799b04cd1cdb8f5145d0"

const socket = io('http://localhost:3000', {
  auth: { soul: SOUL },
  transports: ['websocket']
});

console.log('🟡 Connecting as sisyphus-ai...\n');

let eventCount = 0;

socket.on('connect', () => {
  console.log('✅ WebSocket connected');
});

socket.on('connected', (data) => {
  console.log('🟢 ONLINE:', data);
  console.log('\n⏳ Waiting for messages or friend requests...\n');
});

socket.on('message:receive', (msg) => {
  eventCount++;
  console.log(`\n📨 MESSAGE #${eventCount}:`);
  console.log('From:', msg.from);
  console.log('To:', msg.to);
  console.log('Type:', msg.type);
  console.log('Text:', msg.payload?.text);
  console.log('---');
});

socket.on('friend:request', (data) => {
  eventCount++;
  console.log(`\n👥 FRIEND REQUEST #${eventCount}:`);
  console.log('From:', data.from);
  console.log('Message:', data.message);
  console.log('---');
});

socket.on('friend:accepted', (data) => {
  eventCount++;
  console.log('\n✅ FRIEND REQUEST ACCEPTED:', data);
});

socket.on('friend:rejected', (data) => {
  eventCount++;
  console.log('\n❌ FRIEND REQUEST REJECTED:', data);
});

socket.on('error', (err) => console.error('❌ Error:', err));

setTimeout(() => {
  console.log(`\n⏱️ Time up. Total events: ${eventCount}`);
  socket.disconnect();
  process.exit(0);
}, 10000);
