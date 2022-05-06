const WEB_SOCKET_URL = process.env.WEB_SOCKET_URL || 'http://localhost:3000';

const io = require('socket.io-client');
const socket = io.connect(WEB_SOCKET_URL);

const handler = async (event) => {
  let payload = { id: '1', message: 'Hello World' };
  socket.emit('from lambda', payload);
  return 'Sent message!';
};

exports.handler = handler;

// for Unit Testing
module.exports = {
  handler,
};
