import { describe, test, expect } from 'vitest';
import { InsightsService } from '../services/InsightsService.js';
import { EMISSION_FACTORS } from '../config/emission-factors.js';

describe('InsightsService - Unit Tests', () => {
  test('should return default recommendations if logs history is empty', () => {
    const recommendations = InsightsService.generateRecommendations([], 'US');
    
    expect(recommendations.length).toBeGreaterThanOrEqual(3);
    // Assert structure
    recommendations.forEach(rec => {
      expect(rec).toHaveProperty('title');
      expect(rec).toHaveProperty('description');
      expect(rec).toHaveProperty('savings');
      expect(rec).toHaveProperty('category');
      expect(rec).toHaveProperty('impact');
    });

    // Check that savings are positive and sorted
    for (let i = 0; i < recommendations.length - 1; i++) {
      expect(recommendations[i].savings).toBeGreaterThanOrEqual(recommendations[i+1].savings);
    }
  });

  test('should compute dynamic savings based on actual car trips', () => {
    // 2 car logs: total distance = 10km + 30km = 40km. Avg distance = 20km.
    // Switching 8 car trips of avg 20km to transit
    // Savings = 8 * 20 * (car_factor - transit_factor)
    const logs = [
      {
        travelMode: 'car',
        distance: 10.0,
        items: []
      },
      {
        travelMode: 'car',
        distance: 30.0,
        items: []
      }
    ];

    const recommendations = InsightsService.generateRecommendations(logs, 'US');
    const transitRec = recommendations.find(r => r.title === 'Take Public Transit');
    
    expect(transitRec).toBeDefined();
    
    const carFactor = EMISSION_FACTORS.transport.car;
    const transitFactor = EMISSION_FACTORS.transport.transit;
    const expectedSavings = 8 * 20.0 * (carFactor - transitFactor);
    
    expect(transitRec.savings).toBeCloseTo(expectedSavings, 2);
    expect(transitRec.description).toContain('20.0 km per car trip');
  });

  test('should compute diet savings based on meat purchased in logs', () => {
    // 2.0 kg of meat purchased in logs spanning 10 days
    // Monthly meat = (2.0 / 10) * 30 = 6.0 kg
    // Half = 3.0 kg reduction
    // Savings = 3.0 * (meat_factor - produce_factor)
    const firstDate = new Date();
    const secondDate = new Date();
    secondDate.setDate(firstDate.getDate() - 10); // 10 days ago

    const logs = [
      {
        scannedAt: firstDate,
        items: [
          { name: 'Ground Beef', category: 'meat', quantity: 1.5 }
        ]
      },
      {
        scannedAt: secondDate,
        items: [
          { name: 'Chicken Wings', category: 'meat', quantity: 0.5 }
        ]
      }
    ];

    const recommendations = InsightsService.generateRecommendations(logs, 'US');
    const meatRec = recommendations.find(r => r.title === 'Adopt a Plant-Forward Diet');
    
    expect(meatRec).toBeDefined();

    const expectedMonthlyMeat = (2.0 / 10) * 30; // 6.0 kg
    const expectedSavings = (expectedMonthlyMeat * 0.5) * (EMISSION_FACTORS.food.meat - EMISSION_FACTORS.food.produce);

    expect(meatRec.savings).toBeCloseTo(expectedSavings, 2);
    expect(meatRec.description).toContain('6.0 kg of meat per month');
  });

  test('should rank insights by potential carbon savings in descending order', () => {
    // Custom logs with high meat intake and high car travel to generate large numbers
    const logs = [
      {
        travelMode: 'car',
        distance: 50.0, // Avg distance = 50km
        scannedAt: new Date(),
        items: [
          { name: 'Meat', category: 'meat', quantity: 5.0 } // high meat
        ]
      }
    ];

    const recommendations = InsightsService.generateRecommendations(logs, 'US');
    
    // Check sorting order
    for (let i = 0; i < recommendations.length - 1; i++) {
      expect(recommendations[i].savings).toBeGreaterThanOrEqual(recommendations[i + 1].savings);
    }
  });
});
