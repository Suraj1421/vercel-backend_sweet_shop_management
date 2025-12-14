import express from 'express';
import { body } from 'express-validator';
import { authenticate, authorizeAdmin } from '../middleware/auth.middleware.js';
import {
  createSweet,
  getAllSweets,
  searchSweets,
  updateSweet,
  deleteSweet,
  purchaseSweet,
  restockSweet,
} from '../controllers/sweet.controller.js';

const router = express.Router();

const sweetValidation = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Sweet name must be at least 2 characters'),
  body('category').trim().notEmpty().withMessage('Category is required'),
  body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('quantity')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Quantity must be a non-negative integer'),
];

// All routes require authentication
router.use(authenticate);

// Public routes (authenticated users)
router.get('/', getAllSweets);
router.get('/search', searchSweets);
router.post('/:id/purchase', purchaseSweet);

// Admin only routes
router.post('/', sweetValidation, authorizeAdmin, createSweet);
router.put('/:id', sweetValidation, authorizeAdmin, updateSweet);
router.delete('/:id', authorizeAdmin, deleteSweet);
router.post('/:id/restock', authorizeAdmin, restockSweet);

export default router;

