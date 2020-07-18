const os = require( 'os' );

const networkInterfaces = os.networkInterfaces( );

console.log(networkInterfaces);

const addr = networkInterfaces.eth0[0].address;

const server = require('http').createServer();
const io = require('socket.io')(server, {wsEngine: "ws"});
const User = require("./classes/User");

console.log("Server started");
console.log("");

const usersData = [];

io.on('connect', socket => {  

  console.log("New user connected");
  
  socket.on("register", (data) => {  
    if (usersData.filter((user) => user.login == data).length) {
      socket.emit("register", "false");
    }
    else {
      socket.emit("register", "true");
      
      usersData.push(new User(data));      
    }
  });

  socket.on("check_login", (data) => {  
    const user = usersData.filter((user) => user.login == data);
    if (user.length) {
      if (user[0].connected) {
        socket.emit("check_login", "alreadyExists");
      }
      else {
        socket.emit("check_login", "true");
        socket.user = user[0];
        socket.user.connected = true;
        socket.user.id = socket.client.id;   
        
        updateRooms();
      }
    }
    else {
      socket.emit("check_login", "notFound");
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected");
    if (socket.user) {
      socket.user.connected = false;
      const roomName = socket.user.nowRoom;
      socket.user.nowRoom = undefined;
      delete socket.user;
      updateRoomUsers(roomName);
    }
  });

  socket.on("create_room", (data) => {    
    if (Object.keys(io.sockets.adapter.rooms).includes(data)) socket.emit("create_room", "alreadyExists");
    else {
      socket.join(data);
      socket.emit("create_room", "true");
      socket.user.nowRoom = data;
      updateRoomUsers(data);
      updateRooms();
    }    
  });

  socket.on("connect_room", (data) => {
    if (!Object.keys(io.sockets.adapter.rooms).includes(data)) {
      socket.emit("connect_room", "notExists");
      updateRooms();
    }
    else {
      socket.join(data);
      socket.user.nowRoom = data;
      updateRoomUsers(data);
      socket.emit("connect_room", "true");
    }
  });

  socket.on("leave_room", () => {
    const room = socket.user.nowRoom;
    socket.user.nowRoom = undefined;
    socket.leave(room);
    updateRooms();
    updateRoomUsers(room);
  });

  socket.on("message", (data) => {
    io.in(socket.user.nowRoom).emit("message", socket.user.login + ": " + data);
  });

  function updateRoomUsers(RoomName) {
    const users = usersData.filter((user) => user.nowRoom == RoomName).map(user => user.login).join(',');
    const data = JSON.stringify({
      destination: "chatRoom",
      data: users
    });
    io.in(RoomName).emit("data_sender", data);    
  }

  function updateRooms() {
    const rooms = Object.keys(io.sockets.adapter.rooms).filter(room => room.length < 16).join(',');
    const data = JSON.stringify({
      destination: "roomSelect",
      data: rooms
    });
    io.emit("data_sender", data);
  }

});

server.listen(3000, addr, () => {
  console.log(`Server started on http://${addr}:3000`);
});