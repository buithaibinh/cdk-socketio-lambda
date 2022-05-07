const WEB_SOCKET_URL = process.env.WEB_SOCKET_URL || 'http://localhost:3000';

const io = require('socket.io-client');
const handler = async (event) => {
  const socket = io(WEB_SOCKET_URL);
  socket.on('connect', () => {
    console.log('connected');
    let payload = { id: Date.now(), message: 'Hello World' };

    console.log('sending payload', payload);
    socket.emit('from lambda', payload);
    // disconnect socket to end lambda execution
    socket.disconnect();
    console.log('disconnected');
  });

  return 'Sent message!';
};

exports.handler = handler;

// for Unit Testing
module.exports = {
  handler,
};
