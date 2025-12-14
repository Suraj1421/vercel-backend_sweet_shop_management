import Sweet from '../models/Sweet.model.js';
import { validationResult } from 'express-validator';

export const createSweet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const sweet = await Sweet.create(req.body);
    res.status(201).json({
      message: 'Sweet created successfully',
      sweet,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const getAllSweets = async (req, res) => {
  try {
    const sweets = await Sweet.find().sort({ createdAt: -1 });
    res.json({ sweets });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const searchSweets = async (req, res) => {
  try {
    const { name, category, minPrice, maxPrice } = req.query;

    const query = {};

    if (name) {
      query.name = { $regex: name, $options: 'i' };
    }

    if (category) {
      query.category = { $regex: category, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    const sweets = await Sweet.find(query).sort({ createdAt: -1 });
    res.json({ sweets });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const updateSweet = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ errors: errors.array() });
      return;
    }

    const { id } = req.params;
    const sweet = await Sweet.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!sweet) {
      res.status(404).json({ message: 'Sweet not found' });
      return;
    }

    res.json({
      message: 'Sweet updated successfully',
      sweet,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const deleteSweet = async (req, res) => {
  try {
    const { id } = req.params;
    const sweet = await Sweet.findByIdAndDelete(id);

    if (!sweet) {
      res.status(404).json({ message: 'Sweet not found' });
      return;
    }

    res.json({ message: 'Sweet deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const purchaseSweet = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity = 1 } = req.body;

    const sweet = await Sweet.findById(id);

    if (!sweet) {
      res.status(404).json({ message: 'Sweet not found' });
      return;
    }

    if (sweet.quantity < quantity) {
      res.status(400).json({
        message: 'Insufficient quantity in stock',
        available: sweet.quantity,
      });
      return;
    }

    sweet.quantity -= quantity;
    await sweet.save();

    res.json({
      message: 'Purchase successful',
      sweet,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

export const restockSweet = async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity <= 0) {
      res.status(400).json({ message: 'Valid quantity is required' });
      return;
    }

    const sweet = await Sweet.findById(id);

    if (!sweet) {
      res.status(404).json({ message: 'Sweet not found' });
      return;
    }

    sweet.quantity += quantity;
    await sweet.save();

    res.json({
      message: 'Restock successful',
      sweet,
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Server error' });
  }
};

