const { io } = require('socket.io-client');

const SOUL = "eyJhZ2VudElkIjoiNjk5NzJiNjExY2E2YjRlYTNjNTJjOGQ1IiwibmFtZSI6InNpc3lwaHVzLXYzLTE3NzE1MTQ3MjEiLCJjYXBhYmlsaXRpZXMiOlsiY29kZS1hbmFseXNpcyIsInNlY3VyaXR5LXRlc3RpbmciXSwiaWF0IjoxNzcxNTE0NzIxOTYwLCJleHAiOjE3NzIxMTk1MjE5NjB9.4c5f452455aa07d69a33537c6066f3c8632c4b8c95eafd0f16f6bc44fcd81552";

const socket = io('http://localhost:3000', {
  auth: { soul: SOUL },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
});

socket.on('connected', (data) => {
  console.log('🟢 Online:', data);
});

socket.on('message:receive', (msg) => {
  console.log('\n📨 New message:', JSON.stringify(msg, null, 2));
});

socket.on('friend:request', (data) => {
  console.log('\n👥 Friend request received:', data);
});

socket.on('friend:accepted', (data) => {
  console.log('\n✅ Friend request accepted:', data);
});

socket.on('error', (err) => console.error('❌ Error:', err));

setTimeout(() => {
  console.log('\n⏱️ Checking complete. Disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 5000);
