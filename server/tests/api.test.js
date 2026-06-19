import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../app.js';
import prisma from '../prisma/client.js';
import { AIBillParser } from '../services/AIBillParser.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ecotrack-secret-key-12345!';

describe('EcoTrack API - Integration Tests', () => {
  let token;
  
  beforeAll(async () => {
    // Generate valid test JWT token
    token = jwt.sign({ userId: 'default-user' }, JWT_SECRET);

    // Mock the AIBillParser.parseBill response to decouple tests from OCR / AI workers
    vi.spyOn(AIBillParser, 'parseBill').mockResolvedValue({
      shopName: "Trader Joe's",
      shopAddress: "555 9th St, San Francisco, CA 94103",
      items: [
        { name: "Organic Whole Milk", category: "dairy", quantity: 2.0, unit: "liter" },
        { name: "Organic Spinach", category: "produce", quantity: 0.5, unit: "kg" }
      ],
      total: 15.0
    });

    // Connect to database and ensure the default user is seeded
    await prisma.$connect();
    await prisma.user.upsert({
      where: { id: 'default-user' },
      update: {
        email: 'user@gmail.com',
      },
      create: {
        id: 'default-user',
        email: 'user@gmail.com',
        homeLat: 37.7749,
        homeLng: -122.4194,
        country: 'US',
        monthlyGoal: 500.0,
      }
    });
  });

  afterAll(async () => {
    // Close Prisma connection
    await prisma.$disconnect();
  });

  // 1. Test POST /api/onboarding
  test('POST /api/onboarding should update user coordinates and country', async () => {
    const response = await request(app)
      .post('/api/onboarding')
      .set('Authorization', `Bearer ${token}`)
      .send({ lat: 40.7128, lng: -74.0060 }); // New York coords

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.homeLat).toBe(40.7128);
    expect(response.body.user.homeLng).toBe(-74.0060);
    expect(response.body).toHaveProperty('geoInfo');
    expect(response.body.geoInfo.countryCode).toBe('US');
  });

  // 2. Test POST /api/logs/parse (Uses DEMO_MODE mock fixture)
  test('POST /api/logs/parse should return parsed receipt details with travel mode inference', async () => {
    const response = await request(app)
      .post('/api/logs/parse')
      .set('Authorization', `Bearer ${token}`)
      .send({ imageBase64: 'data:image/jpeg;base64,dGVzdGltYWdl' }); // mock base64

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('shopName');
    expect(response.body).toHaveProperty('shopAddress');
    expect(response.body).toHaveProperty('items');
    expect(response.body).toHaveProperty('distance');
    expect(response.body).toHaveProperty('travelMode');
    expect(response.body.items.length).toBeGreaterThan(0);
  });

  // 3. Test POST /api/logs (persisting the entry and returning calculations)
  test('POST /api/logs should persist receipt data and return calculated carbon footprint', async () => {
    const testLog = {
      shopName: 'Test Bio Store',
      shopAddress: '123 Green Way, SF',
      shopLat: 37.7750,
      shopLng: -122.4200,
      distance: 2.5,
      travelMode: 'cycling', // 0 emissions
      items: [
        { name: 'Organic Chicken', category: 'meat', quantity: 1.5, unit: 'kg' },
        { name: 'Oat Milk', category: 'dairy', quantity: 2.0, unit: 'liter' }
      ]
    };

    const response = await request(app)
      .post('/api/logs')
      .set('Authorization', `Bearer ${token}`)
      .send(testLog);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.shopName).toBe('Test Bio Store');
    
    // Emissions calculations checks:
    // Cycling: 2.5 * 0 = 0 travel emissions
    // Meat: 1.5 * 20.0 = 30 kg CO2e
    // Dairy: 2.0 * 5.0 = 10 kg CO2e
    // Total product = 40 kg CO2e. Total = 40 kg CO2e.
    expect(response.body.travelEmissions).toBe(0);
    expect(response.body.productEmissions).toBeCloseTo(40, 2);
    expect(response.body.totalEmissions).toBeCloseTo(40, 2);

    // Clean up test entry
    await prisma.log.delete({ where: { id: response.body.id } });
  });

  // 4. Test GET /api/dashboard
  test('GET /api/dashboard should return summary aggregates, charts data, and confidence indicator', async () => {
    const response = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('today');
    expect(response.body).toHaveProperty('thisWeek');
    expect(response.body).toHaveProperty('thisMonth');
    expect(response.body).toHaveProperty('monthlyGoal');
    expect(response.body).toHaveProperty('categoryBreakdown');
    expect(response.body).toHaveProperty('trendData');
    expect(response.body).toHaveProperty('confidence');
    expect(response.body.confidence).toHaveProperty('level');
    expect(response.body.confidence).toHaveProperty('score');
  });

  // 5. Test GET /api/insights
  test('GET /api/insights should return list of ranked tips', async () => {
    const response = await request(app)
      .get('/api/insights')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    if (response.body.length > 0) {
      expect(response.body[0]).toHaveProperty('title');
      expect(response.body[0]).toHaveProperty('savings');
    }
  });
});
