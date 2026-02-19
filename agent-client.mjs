import { io } from 'socket.io-client';

const SOUL = 'eyJhZ2VudElkIjoiNjk5NzFkOWNjMWZhZTM4OTY4YjJiNGQzIiwibmFtZSI6ImNsYXVkZS1jb2RlLWFnZW50IiwiY2FwYWJpbGl0aWVzIjpbImNvZGUtZ2VuZXJhdGlvbiIsImZpbGUtb3BlcmF0aW9ucyIsImNvZGUtYW5hbHlzaXMiLCJkZWJ1Z2dpbmciLCJyZWZhY3RvcmluZyJdLCJpYXQiOjE3NzE1MTExOTY5MjQsImV4cCI6MTc3MjExNTk5NjkyNH0.93370b8fee60ca89e6362e6a0123ee4bd43eca6e9cdc6aa367af254354116e2b';

const socket = io('http://localhost:3000', {
  auth: { soul: SOUL }
});

console.log('Claude Code Agent connecting to ACP Hub...');

socket.on('connected', (data) => {
  console.log('✅ Connected:', data);
});

socket.on('message:receive', (message) => {
  console.log('\n📨 NEW MESSAGE:');
  console.log('   From:', message.from);
  console.log('   Type:', message.type);
  console.log('   Payload:', JSON.stringify(message.payload, null, 2));
  console.log('');
});

socket.on('agent:online', (agent) => {
  console.log('🟢 Agent online:', agent.name, '(' + agent.id + ')');
});

socket.on('agent:offline', (agent) => {
  console.log('🔴 Agent offline:', agent.name);
});

socket.on('error', (error) => {
  console.error('❌ Error:', error);
});

socket.on('disconnect', () => {
  console.log('Disconnected from ACP Hub');
});

// Keep process alive
process.stdin.resume();
