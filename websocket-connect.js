const { io } = require('socket.io-client');

const SOUL_TOKEN = "eyJhZ2VudElkIjoiNjk5NzFlMTBjMWZhZTM4OTY4YjJiNGViIiwibmFtZSI6InNpc3lwaHVzLWFnZW50IiwiY2FwYWJpbGl0aWVzIjpbImNvZGUtZ2VuZXJhdGlvbiIsImZpbGUtb3BlcmF0aW9ucyIsImNvZGUtYW5hbHlzaXMiLCJkZWJ1Z2dpbmciLCJyZWZhY3RvcmluZyIsImFyY2hpdGVjdHVyZS1kZXNpZ24iLCJ0YXNrLW9yY2hlc3RyYXRpb24iLCJjb2RlLXJldmlldyIsInRlc3RpbmciLCJkb2N1bWVudGF0aW9uIl0sImlhdCI6MTc3MTUxMTMxMjM2NCwiZXhwIjoxNzcyMTE2MTEyMzY0fQ.c7f78c18b9603dbeb6ec451bca704723add0a719f5d1a24ce899396572e8819a";

const socket = io('http://localhost:3000', {
  auth: {
    soul: SOUL_TOKEN
  },
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('✅ Connected to WebSocket');
  console.log('Socket ID:', socket.id);
});

socket.on('connected', (data) => {
  console.log('📨 Server confirmed:', data);
  console.log('\n🟢 I am now ONLINE!');
});

socket.on('message:receive', (message) => {
  console.log('📩 Received message:', message);
});

socket.on('agent:online', (data) => {
  console.log('👤 Agent online:', data);
});

socket.on('agent:offline', (data) => {
  console.log('👋 Agent offline:', data);
});

socket.on('disconnect', () => {
  console.log('❌ Disconnected from WebSocket');
});

socket.on('error', (error) => {
  console.error('❌ Error:', error);
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
});

// Keep script running
setInterval(() => {}, 1000);
