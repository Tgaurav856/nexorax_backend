const asyncHandler = require("express-async-handler");
const Cart = require("../models/Cart");
const Product = require("../models/Product");

// ─────────────────────────────────────────────────────────────
// @desc    Add a product to cart (or increase qty if exists)
// @route   POST /api/cart/add
// @access  Private / User
// ─────────────────────────────────────────────────────────────
const addToCart = asyncHandler(async (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    res.status(400);
    throw new Error("Product ID is required.");
  }

  const qty = parseInt(quantity, 10);
  if (qty < 1) {
    res.status(400);
    throw new Error("Quantity must be at least 1.");
  }

  // Verify product exists and has enough stock
  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }
  if (product.stock < qty) {
    res.status(400);
    throw new Error(`Only ${product.stock} units available in stock.`);
  }

  // Find or create cart for the user
  let cart = await Cart.findOne({ user: req.user._id });

  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }

  // Check if product already in cart
  const existingItemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (existingItemIndex >= 0) {
    // Product exists — increase quantity
    const newQty = cart.items[existingItemIndex].quantity + qty;
    if (newQty > product.stock) {
      res.status(400);
      throw new Error(`Cannot add more. Only ${product.stock} units in stock.`);
    }
    cart.items[existingItemIndex].quantity = newQty;
  } else {
    // New product — push to items array
    cart.items.push({
      product: productId,
      quantity: qty,
      priceAtTime: product.price,
    });
  }

  await cart.save();

  // Populate product details before responding
  await cart.populate("items.product", "name image price stock");

  res.status(200).json({
    success: true,
    message: "Product added to cart.",
    data: cart,
  });
});

// ─────────────────────────────────────────────────────────────
// @desc    Get current user's cart
// @route   GET /api/cart
// @access  Private / User
// ─────────────────────────────────────────────────────────────
const getCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate(
    "items.product",
    "name image price stock category"
  );

  if (!cart) {
    return res.status(200).json({
      success: true,
      data: { items: [], totalPrice: 0 },
    });
  }

  res.status(200).json({
    success: true,
    data: cart,
  });
});

// ─────────────────────────────────────────────────────────────
// @desc    Update product quantity in cart
// @route   PUT /api/cart/update/:productId
// @access  Private / User
// ─────────────────────────────────────────────────────────────
const updateCartItem = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  const qty = parseInt(quantity, 10);
  if (!qty || qty < 1) {
    res.status(400);
    throw new Error("Quantity must be a positive number.");
  }

  const product = await Product.findById(productId);
  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }
  if (product.stock < qty) {
    res.status(400);
    throw new Error(`Only ${product.stock} units available in stock.`);
  }

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found.");
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.product.toString() === productId
  );

  if (itemIndex === -1) {
    res.status(404);
    throw new Error("Product not found in cart.");
  }

  cart.items[itemIndex].quantity = qty;
  await cart.save();
  await cart.populate("items.product", "name image price stock");

  res.status(200).json({
    success: true,
    message: "Cart updated successfully.",
    data: cart,
  });
});

// ─────────────────────────────────────────────────────────────
// @desc    Remove a product from cart
// @route   DELETE /api/cart/remove/:productId
// @access  Private / User
// ─────────────────────────────────────────────────────────────
const removeFromCart = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found.");
  }

  const initialLength = cart.items.length;
  cart.items = cart.items.filter(
    (item) => item.product.toString() !== productId
  );

  if (cart.items.length === initialLength) {
    res.status(404);
    throw new Error("Product not found in cart.");
  }

  await cart.save();
  await cart.populate("items.product", "name image price stock");

  res.status(200).json({
    success: true,
    message: "Product removed from cart.",
    data: cart,
  });
});

// ─────────────────────────────────────────────────────────────
// @desc    Clear entire cart
// @route   DELETE /api/cart/clear
// @access  Private / User
// ─────────────────────────────────────────────────────────────
const clearCart = asyncHandler(async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    res.status(404);
    throw new Error("Cart not found.");
  }

  cart.items = [];
  await cart.save();

  res.status(200).json({
    success: true,
    message: "Cart cleared.",
    data: { items: [], totalPrice: 0 },
  });
});

module.exports = { addToCart, getCart, updateCartItem, removeFromCart, clearCart };
