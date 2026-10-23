const asyncHandler = require('express-async-handler');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { generateAccessToken, generateRefreshToken } = require('../utils/generateTokens');

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};


const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, organizationName, phone, verificationDocument } = req.body;

  if (!name || !email || !password) {
    res.status(400);
    throw new Error('Name, email and password are required');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409);
    throw new Error('An account with this email already exists');
  }

  const NON_CITIZEN_ROLES = ['eoc', 'hospital', 'shelter', 'rescue_team', 'ngo', 'volunteer'];
  const docPayload =
    NON_CITIZEN_ROLES.includes(role) && verificationDocument?.dataUrl
      ? {
          dataUrl: verificationDocument.dataUrl,
          fileName: verificationDocument.fileName || '',
          status: 'pending', 
          uploadedAt: new Date(),
        }
      : undefined;

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'citizen',
    organizationName,
    phone,
    verificationDocument: docPayload,
  });

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.status(201).json({ success: true, user, accessToken });
});


const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +refreshTokenHash');
  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);
  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save();

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
  res.json({ success: true, user, accessToken });
});


const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    res.status(401);
    throw new Error('No refresh token provided');
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    res.status(401);
    throw new Error('Refresh token invalid or expired — please log in again');
  }

  const user = await User.findById(decoded.id).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    res.status(401);
    throw new Error('Session no longer valid — please log in again');
  }

  const matches = await bcrypt.compare(token, user.refreshTokenHash);
  if (!matches) {
    res.status(401);
    throw new Error('Refresh token does not match — please log in again');
  }

  const accessToken = generateAccessToken(user);
  res.json({ success: true, accessToken });
});


const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      await User.findByIdAndUpdate(decoded.id, { refreshTokenHash: undefined });
    } catch {
      // token already invalid — nothing to clean up server-side
    }
  }
  res.clearCookie('refreshToken', { path: '/api/auth' });
  res.json({ success: true, message: 'Logged out' });
});

// @route GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = { register, login, refresh, logout, getMe };
