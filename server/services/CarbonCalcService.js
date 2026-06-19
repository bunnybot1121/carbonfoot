import { EMISSION_FACTORS, DISTANCE_THRESHOLDS } from '../config/emission-factors.js';

export class CarbonCalcServiceClass {
  // Infer travel mode based on distance thresholds from configuration
  inferTravelMode(distance) {
    if (distance === null || distance === undefined || distance < 0) {
      return 'transit'; // safe default
    }
    
    if (distance <= DISTANCE_THRESHOLDS.walkingMax) {
      return 'walking';
    } else if (distance <= DISTANCE_THRESHOLDS.bikeMax) {
      return 'cycling';
    } else if (distance <= DISTANCE_THRESHOLDS.transitMax) {
      return 'transit';
    } else {
      return 'car';
    }
  }

  // Calculate travel emissions: distance (km) * factor (kg CO2e / km)
  calculateTravelEmissions(distance, mode) {
    if (!distance || distance < 0) return 0;
    
    const activeMode = mode || this.inferTravelMode(distance);
    const factor = EMISSION_FACTORS.transport[activeMode];
    
    if (factor === undefined) {
      // Fallback if mode is unrecognized
      return distance * EMISSION_FACTORS.transport.transit;
    }
    
    return distance * factor;
  }

  // Calculate emissions for list of products
  // Reject negative quantities. Handle 0 quantities. Fallback for unrecognized categories.
  calculateProductEmissions(items) {
    if (!items || !Array.isArray(items)) {
      return { total: 0, items: [] };
    }

    let total = 0;
    const processedItems = items.map(item => {
      const qty = item.quantity !== undefined ? item.quantity : 1;
      
      if (qty < 0) {
        throw new Error(`Invalid quantity: ${qty}. Negative values are rejected.`);
      }

      if (qty === 0) {
        return {
          ...item,
          emissions: 0
        };
      }

      // Ensure category matches database expectation
      const category = item.category || 'other';
      const factor = EMISSION_FACTORS.food[category] || EMISSION_FACTORS.food.other;
      const emissions = qty * factor;
      total += emissions;

      return {
        ...item,
        category,
        emissions
      };
    });

    return {
      total,
      items: processedItems
    };
  }
}

export const CarbonCalcService = new CarbonCalcServiceClass();
