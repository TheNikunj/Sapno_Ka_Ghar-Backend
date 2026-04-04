const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Home = require('../models/Home');

// Signup
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Enforce basic schema boundaries
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required to register.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters long.' });

    let userRole = role === 'Member' ? 'Member' : 'Owner'; 
    if (role === 'Admin') userRole = 'Admin'; 
    
    const isVerified = userRole === 'Admin' ? true : false;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword, role: userRole, isVerified });
    await newUser.save();
    res.status(201).json({ message: 'User registered successfully. Waiting for verification.' });
  } catch (error) {
    // 11000 Unique Constraint duplicate check
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email is already associated with an account. Please login.' });
    }
    res.status(500).json({ error: error.message });
  }
};

// Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Please enter both email and password.' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'No account found with this email. Please register.' });
    if (user.isBlocked) return res.status(403).json({ error: 'Account Suspended by Admin' });
    if (!user.isVerified && user.role !== 'Member') return res.status(403).json({ error: 'Account not verified yet. Wait for Admin.' }); // Members verify later via Home

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

    // Fallback if legacy user lacks name
    const finalName = user.name || user.email.split('@')[0];

    const token = jwt.sign({ id: user._id, role: user.role, email: user.email, name: finalName }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: { id: user._id, role: user.role, email: user.email, name: finalName } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Verify User
exports.verifyUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const userToVerify = await User.findById(userId);
    if (!userToVerify) return res.status(404).json({ error: 'User not found' });
    
    userToVerify.isVerified = true;
    await userToVerify.save();
    res.json({ message: 'User verified successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get pending users
exports.getPendingUsers = async (req, res) => {
  try {
    const { role } = req.user; 
    let query = { isVerified: false };
    if (role === 'Admin') {
      query.role = 'Owner';
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    const pendingUsers = await User.find(query).select('-password');
    res.json(pendingUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// List Owners with system metrics
exports.getOwners = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Unauthorized' });
    
    // Fetch all active/verified owners
    const owners = await User.find({ role: 'Owner', isVerified: true }).select('-password');
    
    // Process metrics
    const ownerData = await Promise.all(owners.map(async (owner) => {
      const home = await Home.findOne({ owner: owner._id });
      let memberCount = 0;
      let roomCount = 0;
      let deviceCount = 0;
      
      if (home) {
        memberCount = home.members.length;
        roomCount = home.rooms.length;
        home.rooms.forEach(r => {
          deviceCount += r.devices.length;
        });
      }
      
      return {
        ...owner.toObject(),
        memberCount,
        roomCount,
        deviceCount,
        houseName: home ? home.houseName : 'No Setup Yet'
      };
    }));
    
    res.json(ownerData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Toggle Block globally
exports.toggleBlockUser = async (req, res) => {
  try {
    if (req.user.role !== 'Admin') return res.status(403).json({ error: 'Unauthorized' });
    
    const userToBlock = await User.findById(req.params.userId);
    if (!userToBlock) return res.status(404).json({ error: 'User not found' });
    
    userToBlock.isBlocked = !userToBlock.isBlocked;
    await userToBlock.save();
    
    res.json({ message: 'User block status updated', isBlocked: userToBlock.isBlocked });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
