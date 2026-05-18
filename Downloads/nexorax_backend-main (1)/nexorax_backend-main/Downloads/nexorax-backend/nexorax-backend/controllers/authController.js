const asyncHandler = require("express-async-handler");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// ─────────────────────────────────────────────────────────────
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    res.status(400);
    throw new Error("Please provide name, email, and password.");
  }

  // Check if email already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    res.status(409);
    throw new Error("An account with this email already exists.");
  }

  // Create user (password is hashed in the model's pre-save hook)
  const user = await User.create({
    name,
    email,
    password,
    role: role === "admin" ? "admin" : "user", // Only allow if explicitly passed
  });

  const token = generateToken(user._id);

  res.status(201).json({
    success: true,
    message: "Account created successfully.",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    },
  });
});

// ─────────────────────────────────────────────────────────────
// @desc    Login user & return JWT
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error("Please provide email and password.");
  }

  // Find user and explicitly select password (excluded by default)
  const user = await User.findOne({ email }).select("+password");

  if (!user || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password.");
  }

  const token = generateToken(user._id);

  res.status(200).json({
    success: true,
    message: "Login successful.",
    data: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token,
    },
  });
});

// ─────────────────────────────────────────────────────────────
// @desc    Get currently logged-in user's profile
// @route   GET /api/auth/me
// @access  Private
// ─────────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

module.exports = { register, login, getMe };
