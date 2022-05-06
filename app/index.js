const app = require('express')();
const http = require('http').Server(app);

const io = require('socket.io')(http, {
  cors: {
    origin: '*',
  },
});
const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  socket.on('from lambda', (msg) => {
    // TODO do something with msg. You can do some business logic here

    // send event to all clients via socket.io
    io.emit('to client', msg);
  });
});

/**
 * middleware function is a function that gets executed for every incoming connection
 * use for authentication / authorization
 */
io.use((socket, next) => {
  // console.log('socket.handshake', socket.handshake);
  // as I remember, loopback 3 has access to the request object
  // console.log('socket.request', socket.request.accessToken.userId);
  // if (socket.request.accessToken.userId) {
  //   next();
  // } else {
  //   next(new Error("unauthorized"))
  // }

  next();
});

http.listen(port, () => {
  console.log(`Socket.IO server running at http://localhost:${port}/`);
});
