const asyncHandler = require("express-async-handler");
const Product = require("../models/Product");
const { cloudinary } = require("../config/cloudinary");

// ─────────────────────────────────────────────────────────────
// @desc    Add a new product
// @route   POST /api/products
// @access  Private / Admin
// ─────────────────────────────────────────────────────────────
const addProduct = asyncHandler(async (req, res) => {
  const { name, description, price, category, stock } = req.body;

  if (!name || !description || !price || !category) {
    res.status(400);
    throw new Error("Please provide all required product fields.");
  }

  if (!req.file) {
    res.status(400);
    throw new Error("Product image is required.");
  }

  const product = await Product.create({
    name,
    description,
    price: Number(price),
    category: category.toLowerCase(),
    stock: Number(stock) || 0,
    image: {
      url: req.file.path,           // Cloudinary secure URL
      publicId: req.file.filename,  // Cloudinary public_id for deletion
    },
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Product added successfully.",
    data: product,
  });
});

// ─────────────────────────────────────────────────────────────
// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private / Admin
// ─────────────────────────────────────────────────────────────
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  const { name, description, price, category, stock } = req.body;

  // If a new image is uploaded, delete the old one from Cloudinary
  if (req.file) {
    if (product.image?.publicId) {
      await cloudinary.uploader.destroy(product.image.publicId);
    }
    product.image = {
      url: req.file.path,
      publicId: req.file.filename,
    };
  }

  product.name = name || product.name;
  product.description = description || product.description;
  product.price = price !== undefined ? Number(price) : product.price;
  product.category = category ? category.toLowerCase() : product.category;
  product.stock = stock !== undefined ? Number(stock) : product.stock;

  const updatedProduct = await product.save();

  res.status(200).json({
    success: true,
    message: "Product updated successfully.",
    data: updatedProduct,
  });
});

// ─────────────────────────────────────────────────────────────
// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private / Admin
// ─────────────────────────────────────────────────────────────
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  // Remove image from Cloudinary
  if (product.image?.publicId) {
    await cloudinary.uploader.destroy(product.image.publicId);
  }

  await product.deleteOne();

  res.status(200).json({
    success: true,
    message: "Product deleted successfully.",
  });
});

// ─────────────────────────────────────────────────────────────
// @desc    Get all products (with search & category filter + pagination)
// @route   GET /api/products
// @access  Public
// ─────────────────────────────────────────────────────────────
const getProducts = asyncHandler(async (req, res) => {
  const { search, category, page = 1, limit = 10 } = req.query;

  const filter = {};

  // Search by name (case-insensitive)
  if (search) {
    filter.name = { $regex: search, $options: "i" };
  }

  // Filter by category
  if (category) {
    filter.category = category.toLowerCase();
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const skip = (pageNum - 1) * limitNum;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Product.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: products,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
});

// ─────────────────────────────────────────────────────────────
// @desc    Get a single product by ID
// @route   GET /api/products/:id
// @access  Public
// ─────────────────────────────────────────────────────────────
const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    res.status(404);
    throw new Error("Product not found.");
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});

module.exports = {
  addProduct,
  updateProduct,
  deleteProduct,
  getProducts,
  getProductById,
};
