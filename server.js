// here for importing we are using common-js syntax (generally used in node)

const exp = require('constants');
const express = require('express');
const app=express();
const http=require('http');
const path = require('path');
const {Server}=require('socket.io');
const server =http.createServer(app);
const io = new Server(server);

app.use(express.static('dist'));
app.use((req,res,next)=>{
  res.sendFile(path.join(__dirname,'dist','index.html'));
});

const userSocketMap={};

function getAllConnectedClients(roomId){
  //map
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId)=>{
    return {
      socketId,
      username:userSocketMap[socketId]
    }
  });
}

io.on('connection',(socket)=>{

  socket.on("join",({roomId,username})=>{
    userSocketMap[socket.id]=username;
    socket.join(roomId);
    const clients=getAllConnectedClients(roomId);
    clients.forEach(({socketId})=>{
      io.to(socketId).emit("joined",{
        clients,
        username,
        socketId:socket.id,
      })
    })
  })

  socket.on("code-change",({roomId,code})=>{
    socket.in(roomId).emit("code-change",{code});
  })

  socket.on("sync-code",({socketId,code})=>{
    io.to(socketId).emit("code-change",{code})
  })

  socket.on("disconnecting",()=>{
    const rooms=[...socket.rooms];
    rooms.forEach((roomId)=>{
      socket.in(roomId).emit("disconnected",{
        socketId:socket.id,
        username:userSocketMap[socket.id],
      })
    })
    delete userSocketMap[socket.id];
    socket.leave();
  })
});


const PORT=process.env.PORT || 5000;
server.listen(PORT,()=>{
  console.log(`listening on port ${PORT}`);
});