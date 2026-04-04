const Home = require('../models/Home');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Create Home
exports.createHome = async (req, res) => {
  try {
    const { houseName, rooms } = req.body;
    
    // Generate unique home name (e.g. SapnoKaGhar_4910)
    const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
    const uniqueHomeName = houseName.replace(/\s+/g, '') + '_' + randomCode;

    const newHome = new Home({
      owner: req.user.id,
      houseName,
      uniqueHomeName,
      homeCode: randomCode,
      rooms,
      members: []
    });

    await newHome.save();
    
    // Completely populate the newly spawned Array object to ensure frontend bindings succeed
    const populatedHome = await Home.findById(newHome._id)
      .populate('members.user', 'email name')
      .populate('owner', 'email name');
      
    res.status(201).json(populatedHome);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add New Room dynamically
exports.addRoom = async (req, res) => {
  try {
    const { name, devices } = req.body;
    const home = await Home.findOne({ owner: req.user.id });
    if (!home) return res.status(403).json({ error: 'Only the Home Creator can deploy new hardware zones' });

    if (!name) return res.status(400).json({ error: 'Room Zone name is required' });

    home.rooms.push({ name, devices: devices || [] });
    await home.save();

    res.json({ message: 'Room configuration deployed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Home
exports.getHome = async (req, res) => {
  // ... (content omitted to protect it, use match logic below)
  try {
    const userId = req.user.id;
    // Check if user is owner or approved member
    let home = await Home.findOne({ owner: userId })
      .populate('members.user', 'email name')
      .populate('owner', 'email name');
      
    if (!home) {
      // Find where user is member
      home = await Home.findOne({ 'members.user': userId })
        .populate('members.user', 'email name')
        .populate('owner', 'email name');
      
      if(home) {
        // Check if approved
        // Check if approved safely by guarding against Ghost users
        const me = home.members.find(m => m.user && m.user._id.toString() === userId.toString());
        if(me) {
          if(me.status === 'blocked') {
            return res.status(403).json({ error: 'Blocked by Owner' });
          }
          if(me.status !== 'approved') {
            return res.status(403).json({ error: 'Waiting for Owner Approval' });
          }
        }
      }
    }
    
    if (!home) return res.status(404).json({ error: 'No home found' });
    res.json(home);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Join Home (For members)
exports.joinHome = async (req, res) => {
  try {
    const { uniqueHomeName, homeCode } = req.body;
    
    if(!uniqueHomeName && !homeCode) {
      return res.status(400).json({ error: 'Provide Home Name or 4-Digit Code' });
    }

    // Find by either Home Name or Code
    const query = { $or: [] };
    if(uniqueHomeName) query.$or.push({ uniqueHomeName });
    if(homeCode) query.$or.push({ homeCode });

    const home = await Home.findOne(query);
    if (!home) return res.status(404).json({ error: 'Invalid Home Details' });

    // Check if already requested safely
    const alreadyMember = home.members.find(m => m.user && m.user.toString() === req.user.id);
    if(alreadyMember) {
      if(alreadyMember.status === 'blocked') {
        return res.status(403).json({ error: 'You are blocked from this home' });
      }
      return res.status(400).json({ error: 'Already requested or joined' });
    }

    home.members.push({ user: req.user.id, status: 'pending' });
    await home.save();
    
    // Notify the owner dynamically in real-time
    if (req.io) {
      const requestingUser = await User.findById(req.user.id);
      const userName = requestingUser ? requestingUser.name : 'Unknown User';
      const notifMsg = `👤 ${userName} has submitted a request to join the home!`;
      
      const notif = await Notification.create({
        home: home._id,
        actorName: userName,
        message: notifMsg
      });
      
      req.io.to(home._id.toString()).emit('notification', { 
        _id: notif._id.toString(), 
        id: Date.now(), 
        actorName: userName, 
        message: notifMsg, 
        createdAt: new Date().toISOString() 
      });
      req.io.to(home._id.toString()).emit('homeUpdated');
    }

    res.json({ message: 'Join request sent successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Approve Member
exports.approveMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const home = await Home.findOne({ owner: req.user.id });
    if (!home) return res.status(403).json({ error: 'Not authorized' });

    const member = home.members.find(m => m.user && m.user.toString() === memberId);
    if (!member) return res.status(404).json({ error: 'Member request not found' });

    member.status = 'approved';
    await home.save();

    // Verify user in general system
    const userToVerify = await User.findById(memberId);
    if(userToVerify) {
      userToVerify.isVerified = true;
      await userToVerify.save();
    }

    res.json({ message: 'Member approved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Reject Member
exports.rejectMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const home = await Home.findOne({ owner: req.user.id });
    if (!home) return res.status(403).json({ error: 'Not authorized' });

    const member = home.members.find(m => m.user && m.user.toString() === memberId);
    if (!member) return res.status(404).json({ error: 'Member request not found' });

    // Mark as blocked instead of deleting
    member.status = 'blocked';
    member.role = 'member'; // Strip admin if blocked
    await home.save();

    res.json({ message: 'Member request rejected/blocked' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Promote Member to Admin
exports.promoteMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const home = await Home.findOne({ owner: req.user.id });
    if (!home) return res.status(403).json({ error: 'Only the Home Creator can promote members' });

    const member = home.members.find(m => m.user && m.user.toString() === memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });
    if (member.status !== 'approved') return res.status(400).json({ error: 'Cannot promote unapproved members' });

    member.role = 'admin';
    await home.save();

    res.json({ message: 'Member logically promoted to House Admin' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Demote Admin to Member
exports.demoteMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const home = await Home.findOne({ owner: req.user.id });
    if (!home) return res.status(403).json({ error: 'Only the Home Creator can demote members' });

    const member = home.members.find(m => m.user && m.user.toString() === memberId);
    if (!member) return res.status(404).json({ error: 'Member not found' });

    member.role = 'member';
    await home.save();

    res.json({ message: 'Admin downgraded back to Member' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get Pending Members for a Home
exports.getPendingMembers = async (req, res) => {
  try {
    const home = await Home.findOne({ owner: req.user.id }).populate('members.user', 'email name');
    if (!home) return res.json([]);

    const pending = home.members.filter(m => m.status === 'pending');
    res.json(pending);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Fetch strict 24 hour historical logs
exports.getRecentNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    // We first safely locate which home is associated with the calling user
    let home = await Home.findOne({ owner: userId });
    if (!home) {
      home = await Home.findOne({ 'members.user': userId });
    }
    
    if (!home) return res.status(404).json({ error: 'No home linked to your active profile.' });

    // The TTL Index will natively handle auto-dropping documents > 24H old. 
    // We simply sort heavily by newest first.
    const logs = await Notification.find({ home: home._id }).sort({ createdAt: -1 });
    
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Clear All Notifications
exports.clearNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    // Strictly Owners can wipe logs
    let home = await Home.findOne({ owner: userId });
    if (!home) {
      return res.status(403).json({ error: 'Only owners can clear the system logs' });
    }

    await Notification.deleteMany({ home: home._id });
    res.json({ message: 'Notifications cleared successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
