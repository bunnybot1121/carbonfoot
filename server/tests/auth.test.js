import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import prisma from '../prisma/client.js';

describe('EcoTrack Auth API - Integration Tests', () => {
  const testUser = {
    email: 'newwarrior@example.com',
    password: 'securepassword123',
    name: 'Green Hero'
  };

  beforeAll(async () => {
    await prisma.$connect();
    // Clean up if test user exists from a crashed run
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
  });

  afterAll(async () => {
    // Clean up test users
    await prisma.user.deleteMany({
      where: { email: testUser.email }
    });
    await prisma.$disconnect();
  });

  // 1. Verify protected route rejects request without token
  test('GET /api/dashboard should reject requests without token with 401', async () => {
    const response = await request(app).get('/api/dashboard');
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  });

  // 2. Test registration
  test('POST /api/auth/register should create account and return JWT token', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(testUser.email);
    expect(response.body.user.name).toBe(testUser.name);
    expect(response.body.user).not.toHaveProperty('password');
  });

  // 3. Test duplicate registration prevention
  test('POST /api/auth/register should block duplicate email registration', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('already exists');
  });

  // 4. Test login
  test('POST /api/auth/login should authenticate credentials and return token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user.email).toBe(testUser.email);
  });

  // 5. Test wrong credentials
  test('POST /api/auth/login should block incorrect password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid');
  });

  // 6. Test GET /api/auth/me profile retrieval
  test('GET /api/auth/me should fetch profile details using JWT bearer token', async () => {
    // Log in first to get token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    const token = loginResponse.body.token;

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.email).toBe(testUser.email);
  });
});
