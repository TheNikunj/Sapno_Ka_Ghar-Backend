require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const homeRoutes = require('./routes/homeRoutes');
const Home = require('./models/Home');
const User = require('./models/User');
const Notification = require('./models/Notification'); // DB Integration for History

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT']
  }
});

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);

// MongoDB Connection
// Defaulting to MongoDB locally using env var
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/sapnokaghar')
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.log('MongoDB connection error:', err));

// WebSocket logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinHome', ({ homeId }) => {
    socket.join(homeId);
    console.log(`Client joined home: ${homeId}`);
  });

  // Handle toggle requests
  socket.on('toggleDevice', async (data) => {
    const { homeId, roomId, deviceId, state, userName } = data;
    
    try {
      const home = await Home.findById(homeId);
      if (home) {
        const room = home.rooms.id(roomId);
        if (room) {
          const device = room.devices.id(deviceId);
          if (device) {
            device.isOn = state;
            await home.save();
            
            // Broadcast the physical shift to everyone looking at this home
            io.to(homeId).emit('deviceUpdate', { roomId, deviceId, state });

            // Generate precise Action String for DB
            const stateString = state ? 'ON' : 'OFF';
            const notifMsg = `🔔 ${userName} turned ${stateString} the ${device.name}`;
            
            // Step A: Immediately send transient popup to active clients
            io.to(homeId).emit('notification', { _id: Date.now().toString(), id: Date.now(), actorName: userName, stateStr: stateString, deviceName: device.name, message: notifMsg, createdAt: new Date().toISOString() });

            // Step B: Save it permanently to the 24-hour log database
            await Notification.create({
              home: homeId,
              actorName: userName,
              message: notifMsg
            });
          }
        }
      }
    } catch (err) {
      console.log('Error toggling device:', err.message);
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
