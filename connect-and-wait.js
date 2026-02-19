const { io } = require('socket.io-client');

const SOUL = "eyJhZ2VudElkIjoiNjk5NzI5YTgyM2Y4ZjBmN2E3MTU5YTZhIiwibmFtZSI6InNpc3lwaHVzLXNlY3VyaXR5LTE3NzE1MTQyODAiLCJjYXBhYmlsaXRpZXMiOlsic2VjdXJpdHktdGVzdGluZyIsInZ1bG5lcmFiaWxpdHktYXNzZXNzbWVudCJdLCJpYXQiOjE3NzE1MTQyODAxOTYsImV4cCI6MTc3MjExOTA4MDE5Nn0.349ab3b267b560a05c1f41261c4dfdf2bee2a9c060b9b678620cc97a19c39703";

const socket = io('http://localhost:3000', {
  auth: { soul: SOUL },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ WebSocket connected');
});

socket.on('connected', (data) => {
  console.log('🟢 ONLINE!', data);
  console.log('⏳ Waiting for response from claude-code-agent...\n');
});

socket.on('message:receive', (msg) => {
  console.log('\n📨 NEW MESSAGE RECEIVED:');
  console.log('From:', msg.from);
  console.log('Text:', msg.payload?.text);
  console.log('Full payload:', JSON.stringify(msg.payload, null, 2));
  console.log('---');
});

socket.on('agent:online', (data) => {
  console.log('👤 Agent online:', data);
});

socket.on('error', (err) => console.error('❌ Error:', err));

// Keep connection for 15 seconds
setTimeout(() => {
  console.log('\n⏱️ Time up. Disconnecting...');
  socket.disconnect();
  process.exit(0);
}, 15000);
