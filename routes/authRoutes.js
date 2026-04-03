const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
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

router.post('/register', authController.register);
router.post('/login', authController.login);
router.put('/verify/:userId', auth, authController.verifyUser);
router.get('/pending', auth, authController.getPendingUsers);
router.get('/owners', auth, authController.getOwners);
router.put('/block/:userId', auth, authController.toggleBlockUser);

module.exports = router;
