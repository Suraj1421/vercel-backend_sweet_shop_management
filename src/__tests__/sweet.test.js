import request from 'supertest';
import mongoose from 'mongoose';
import app from '../server.js';
import User from '../models/User.model.js';
import Sweet from '../models/Sweet.model.js';
import jwt from 'jsonwebtoken';

describe('Sweet API', () => {
  let userToken;
  let adminToken;
  let userId;
  let adminId;

  beforeAll(async () => {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-sweet-shop';
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Sweet.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await Sweet.deleteMany({});
    
    // Create regular user
    const user = await User.create({
      username: 'testuser',
      email: 'user@example.com',
      password: 'password123',
      role: 'user',
    });
    userId = user._id.toString();
    userToken = jwt.sign(
      { id: userId, role: 'user' },
      process.env.JWT_SECRET || 'default-secret'
    );

    // Create admin user
    const admin = await User.create({
      username: 'admin',
      email: 'admin@example.com',
      password: 'password123',
      role: 'admin',
    });
    adminId = admin._id.toString();
    adminToken = jwt.sign(
      { id: adminId, role: 'admin' },
      process.env.JWT_SECRET || 'default-secret'
    );
  });

  describe('POST /api/sweets', () => {
    it('should create a sweet (admin only)', async () => {
      const response = await request(app)
        .post('/api/sweets')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Chocolate Bar',
          category: 'Chocolate',
          price: 5.99,
          quantity: 100,
        });

      expect(response.status).toBe(201);
      expect(response.body.sweet).toHaveProperty('name', 'Chocolate Bar');
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post('/api/sweets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Chocolate Bar',
          category: 'Chocolate',
          price: 5.99,
        });

      expect(response.status).toBe(403);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/sweets')
        .send({
          name: 'Chocolate Bar',
          category: 'Chocolate',
          price: 5.99,
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/sweets', () => {
    beforeEach(async () => {
      await Sweet.create([
        { name: 'Sweet 1', category: 'Candy', price: 2.99, quantity: 50 },
        { name: 'Sweet 2', category: 'Chocolate', price: 4.99, quantity: 30 },
      ]);
    });

    it('should get all sweets', async () => {
      const response = await request(app)
        .get('/api/sweets')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sweets).toHaveLength(2);
    });
  });

  describe('GET /api/sweets/search', () => {
    beforeEach(async () => {
      await Sweet.create([
        { name: 'Chocolate Bar', category: 'Chocolate', price: 5.99, quantity: 100 },
        { name: 'Gummy Bears', category: 'Candy', price: 3.99, quantity: 50 },
        { name: 'Dark Chocolate', category: 'Chocolate', price: 7.99, quantity: 30 },
      ]);
    });

    it('should search by name', async () => {
      const response = await request(app)
        .get('/api/sweets/search?name=chocolate')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sweets.length).toBeGreaterThan(0);
    });

    it('should search by category', async () => {
      const response = await request(app)
        .get('/api/sweets/search?category=Candy')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sweets.every((s) => s.category === 'Candy')).toBe(true);
    });

    it('should search by price range', async () => {
      const response = await request(app)
        .get('/api/sweets/search?minPrice=4&maxPrice=6')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.sweets.every((s) => s.price >= 4 && s.price <= 6)).toBe(true);
    });
  });

  describe('PUT /api/sweets/:id', () => {
    let sweetId;

    beforeEach(async () => {
      const sweet = await Sweet.create({
        name: 'Original Sweet',
        category: 'Candy',
        price: 2.99,
        quantity: 50,
      });
      sweetId = sweet._id.toString();
    });

    it('should update sweet (admin only)', async () => {
      const response = await request(app)
        .put(`/api/sweets/${sweetId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Sweet',
          price: 3.99,
        });

      expect(response.status).toBe(200);
      expect(response.body.sweet.name).toBe('Updated Sweet');
    });
  });

  describe('DELETE /api/sweets/:id', () => {
    let sweetId;

    beforeEach(async () => {
      const sweet = await Sweet.create({
        name: 'Sweet to Delete',
        category: 'Candy',
        price: 2.99,
        quantity: 50,
      });
      sweetId = sweet._id.toString();
    });

    it('should delete sweet (admin only)', async () => {
      const response = await request(app)
        .delete(`/api/sweets/${sweetId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      
      const deleted = await Sweet.findById(sweetId);
      expect(deleted).toBeNull();
    });
  });

  describe('POST /api/sweets/:id/purchase', () => {
    let sweetId;

    beforeEach(async () => {
      const sweet = await Sweet.create({
        name: 'Purchasable Sweet',
        category: 'Candy',
        price: 2.99,
        quantity: 10,
      });
      sweetId = sweet._id.toString();
    });

    it('should purchase a sweet', async () => {
      const response = await request(app)
        .post(`/api/sweets/${sweetId}/purchase`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 2 });

      expect(response.status).toBe(200);
      expect(response.body.sweet.quantity).toBe(8);
    });

    it('should reject purchase if insufficient quantity', async () => {
      const response = await request(app)
        .post(`/api/sweets/${sweetId}/purchase`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 20 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Insufficient quantity in stock');
    });
  });

  describe('POST /api/sweets/:id/restock', () => {
    let sweetId;

    beforeEach(async () => {
      const sweet = await Sweet.create({
        name: 'Sweet to Restock',
        category: 'Candy',
        price: 2.99,
        quantity: 10,
      });
      sweetId = sweet._id.toString();
    });

    it('should restock sweet (admin only)', async () => {
      const response = await request(app)
        .post(`/api/sweets/${sweetId}/restock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ quantity: 50 });

      expect(response.status).toBe(200);
      expect(response.body.sweet.quantity).toBe(60);
    });

    it('should reject non-admin users', async () => {
      const response = await request(app)
        .post(`/api/sweets/${sweetId}/restock`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ quantity: 50 });

      expect(response.status).toBe(403);
    });
  });
});

