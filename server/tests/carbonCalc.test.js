import { describe, test, expect } from 'vitest';
import { CarbonCalcService } from '../services/CarbonCalcService.js';
import { EMISSION_FACTORS } from '../config/emission-factors.js';

describe('CarbonCalcService - Unit Tests', () => {
  // Test Distance Thresholds & Travel Mode Inference
  describe('inferTravelMode', () => {
    test('should infer walking for distance <= 1.0 km', () => {
      expect(CarbonCalcService.inferTravelMode(0.5)).toBe('walking');
      expect(CarbonCalcService.inferTravelMode(1.0)).toBe('walking');
    });

    test('should infer cycling for distance 1.0 km to 3.0 km', () => {
      expect(CarbonCalcService.inferTravelMode(1.5)).toBe('cycling');
      expect(CarbonCalcService.inferTravelMode(3.0)).toBe('cycling');
    });

    test('should infer transit for distance 3.0 km to 15.0 km', () => {
      expect(CarbonCalcService.inferTravelMode(5.0)).toBe('transit');
      expect(CarbonCalcService.inferTravelMode(15.0)).toBe('transit');
    });

    test('should infer car for distance > 15.0 km', () => {
      expect(CarbonCalcService.inferTravelMode(15.1)).toBe('car');
      expect(CarbonCalcService.inferTravelMode(35.0)).toBe('car');
    });

    test('should fall back to transit for invalid or empty distance values', () => {
      expect(CarbonCalcService.inferTravelMode(null)).toBe('transit');
      expect(CarbonCalcService.inferTravelMode(-5)).toBe('transit');
    });
  });

  // Test Travel Emissions Calculations
  describe('calculateTravelEmissions', () => {
    test('should compute zero emissions for walking or cycling', () => {
      expect(CarbonCalcService.calculateTravelEmissions(0.8, 'walking')).toBe(0);
      expect(CarbonCalcService.calculateTravelEmissions(2.5, 'cycling')).toBe(0);
    });

    test('should compute correct emissions for transit and car based on factors', () => {
      const dist = 10;
      const transitEmissions = dist * EMISSION_FACTORS.transport.transit;
      const carEmissions = dist * EMISSION_FACTORS.transport.car;

      expect(CarbonCalcService.calculateTravelEmissions(dist, 'transit')).toBeCloseTo(transitEmissions, 4);
      expect(CarbonCalcService.calculateTravelEmissions(dist, 'car')).toBeCloseTo(carEmissions, 4);
    });

    test('should auto-infer mode and compute emissions if mode is omitted', () => {
      // 20 km -> inferred mode is car
      const computed = CarbonCalcService.calculateTravelEmissions(20);
      expect(computed).toBeCloseTo(20 * EMISSION_FACTORS.transport.car, 4);
    });
  });

  // Test Product Emissions Calculations
  describe('calculateProductEmissions', () => {
    test('should compute emissions correctly for all standard categories', () => {
      const items = [
        { name: 'Beef Cut', category: 'meat', quantity: 2 },
        { name: 'Cheese Block', category: 'dairy', quantity: 0.5 },
        { name: 'Carrots', category: 'produce', quantity: 3 },
        { name: 'Crackers Box', category: 'packaged_food', quantity: 1.5 },
        { name: 'Liquid Soap', category: 'household', quantity: 1 }
      ];

      const result = CarbonCalcService.calculateProductEmissions(items);
      
      const expectedTotal = 
        (2 * EMISSION_FACTORS.food.meat) +
        (0.5 * EMISSION_FACTORS.food.dairy) +
        (3 * EMISSION_FACTORS.food.produce) +
        (1.5 * EMISSION_FACTORS.food.packaged_food) +
        (1 * EMISSION_FACTORS.food.household);

      expect(result.total).toBeCloseTo(expectedTotal, 4);
      expect(result.items[0].emissions).toBeCloseTo(2 * EMISSION_FACTORS.food.meat, 4);
    });

    test('should apply fallback factor for unmatched or unrecognized category', () => {
      const items = [{ name: 'Sofa Cushion', category: 'furniture_or_unknown', quantity: 2 }];
      const result = CarbonCalcService.calculateProductEmissions(items);
      
      expect(result.total).toBeCloseTo(2 * EMISSION_FACTORS.food.other, 4);
      expect(result.items[0].category).toBe('furniture_or_unknown');
    });

    test('should compute zero emissions for zero quantity', () => {
      const items = [{ name: 'Free Gift', category: 'meat', quantity: 0 }];
      const result = CarbonCalcService.calculateProductEmissions(items);
      
      expect(result.total).toBe(0);
      expect(result.items[0].emissions).toBe(0);
    });

    test('should reject negative quantities and throw an error', () => {
      const items = [{ name: 'Stolen Beef', category: 'meat', quantity: -1.5 }];
      
      expect(() => {
        CarbonCalcService.calculateProductEmissions(items);
      }).toThrow('Negative values are rejected');
    });
  });
});
