const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');
const jwt = require('jsonwebtoken');

// Middleware to protect routes
const auth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ error: 'No token, authorization denied' });
  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(400).json({ error: 'Token is not valid' });
  }
};

router.post('/setup', auth, homeController.createHome);
router.get('/', auth, homeController.getHome);
router.post('/join', auth, homeController.joinHome);
router.post('/room', auth, homeController.addRoom);

// Fetch Historical Logs
router.get('/notifications', auth, homeController.getRecentNotifications);
router.delete('/notifications/clear', auth, homeController.clearNotifications);

// Admin / Owner Controls
router.put('/approve/:memberId', auth, homeController.approveMember);
router.delete('/reject/:memberId', auth, homeController.rejectMember);
router.put('/promote/:memberId', auth, homeController.promoteMember);
router.put('/demote/:memberId', auth, homeController.demoteMember);
router.get('/pending', auth, homeController.getPendingMembers);

module.exports = router;
