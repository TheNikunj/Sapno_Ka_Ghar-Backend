const WebSocket = require('ws');

const ws = new WebSocket('wss://sapno-ka-ghar-backend.onrender.com/socket.io/?EIO=4&transport=websocket');

ws.on('open', function open() {
  console.log('connected');
});

ws.on('close', function close() {
  console.log('disconnected');
});

ws.on('message', function incoming(data) {
  console.log('received: %s', data);
  const msg = data.toString();
  if (msg.startsWith('0')) {
    // Engine.IO Open
    console.log("Sending Socket.IO namespace connect...");
    ws.send('40'); // Connect to '/'
  } else if (msg.startsWith('40')) {
    // Socket.IO connected
    console.log("Sending joinHome event...");
    // Simulate what the ESP32 sends precisely!
    ws.send('42["joinHome", {"homeId":"YOUR_HOME_ID_HERE"}]');
  }
});
