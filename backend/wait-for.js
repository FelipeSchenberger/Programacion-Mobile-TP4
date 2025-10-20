const net = require('net');
const host = process.argv[2] || 'kafka';
const port = parseInt(process.argv[3], 10) || 9092;
const timeout = parseInt(process.argv[4], 10) || 60000;
const start = Date.now();

function tryConnect() {
  const socket = new net.Socket();
  socket.setTimeout(2000);
  socket.once('connect', () => {
    socket.destroy();
    process.exit(0);
  });
  socket.once('error', () => {
    socket.destroy();
    if (Date.now() - start > timeout) {
      console.error(`Timeout waiting for ${host}:${port}`);
      process.exit(1);
    } else {
      setTimeout(tryConnect, 1000);
    }
  });
  socket.once('timeout', () => {
    socket.destroy();
    if (Date.now() - start > timeout) process.exit(1);
    else setTimeout(tryConnect, 1000);
  });
  socket.connect(port, host);
}

tryConnect();