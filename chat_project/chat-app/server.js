const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

// Serve static files from public directory
app.use(express.static('public'));

// Store active users and messages in memory
let activeUsers = new Set();
let chatMessages = [];
const messages = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Send existing messages to new user
    socket.emit('previous messages', chatMessages);

    // Handle join event
    socket.on('join', (username) => {
        socket.username = username;
        activeUsers.add(username);
        
        // Broadcast updated user count and active users list
        io.emit('user count', activeUsers.size);
        io.emit('active users', Array.from(activeUsers));
    });

    // Handle chat message
    socket.on('chat message', (msg) => {
        // Store message in memory
        chatMessages.push(msg);
        // Keep only last 50 messages
        if (chatMessages.length > 50) {
            chatMessages.shift();
        }
        // Broadcast message to all clients
        io.emit('chat message', msg);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        if (socket.username) {
            activeUsers.delete(socket.username);
            io.emit('user count', activeUsers.size);
            io.emit('active users', Array.from(activeUsers));
        }
        console.log('A user disconnected');
    });

    socket.on('add reaction', function(data) {
        const message = messages.get(data.messageId) || { reactions: [] };
        
        message.reactions.push({
            emoji: data.emoji,
            username: data.username
        });
        
        messages.set(data.messageId, message);
        io.emit('reaction added', {
            messageId: data.messageId,
            reactions: message.reactions
        });
    });
});

// Start server
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
