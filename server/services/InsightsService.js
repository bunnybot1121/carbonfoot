import { EMISSION_FACTORS } from '../config/emission-factors.js';

export class InsightsServiceClass {
  // Generate recommendations based on user logs and home country config
  generateRecommendations(logs, country = 'US') {
    const electricityFactor = EMISSION_FACTORS.electricityByCountry[country] || EMISSION_FACTORS.electricityByCountry.DEFAULT;
    
    // Default averages if no user data is present
    const defaultElectricity = EMISSION_FACTORS.householdAverages.electricity_kwh;
    
    // Analyze logs
    let totalCarTrips = 0;
    let totalCarDistance = 0;
    
    let totalMeatQty = 0;
    let totalDairyQty = 0;
    let logCount = logs ? logs.length : 0;

    if (logs && logs.length > 0) {
      logs.forEach(log => {
        if (log.travelMode === 'car') {
          totalCarTrips++;
          totalCarDistance += log.distance || 0;
        }
        if (log.items) {
          log.items.forEach(item => {
            if (item.category === 'meat') {
              totalMeatQty += item.quantity || 0;
            } else if (item.category === 'dairy') {
              totalDairyQty += item.quantity || 0;
            }
          });
        }
      });
    }

    const recommendations = [];

    // 1. Transit Recommendation
    let transitSavings = 0;
    let transitDescription = '';
    const carFactor = EMISSION_FACTORS.transport.car;
    const transitFactor = EMISSION_FACTORS.transport.transit;

    if (totalCarTrips > 0) {
      const avgCarDistance = totalCarDistance / totalCarTrips;
      // Assume user replaces 2 car trips per week (8 per month) with public transit
      transitSavings = 8 * avgCarDistance * (carFactor - transitFactor);
      transitDescription = `Based on your logs, you average ${avgCarDistance.toFixed(1)} km per car trip. Switching 2 weekly car trips to public transit would save ~${transitSavings.toFixed(1)} kg CO2e/month.`;
    } else {
      // Default recommendation
      const defaultDistance = 10; // 10 km default trip
      transitSavings = 8 * defaultDistance * (carFactor - transitFactor); // ~10.8 kg
      transitDescription = `Switching 2 weekly car trips (10 km each) to transit instead of driving saves ~${transitSavings.toFixed(1)} kg CO2e/month.`;
    }
    
    recommendations.push({
      title: 'Take Public Transit',
      description: transitDescription,
      savings: parseFloat(transitSavings.toFixed(2)),
      category: 'transport',
      impact: transitSavings > 30 ? 'High' : (transitSavings > 10 ? 'Medium' : 'Low')
    });

    // 2. Walking / Cycling Recommendation
    let activeTravelSavings = 0;
    let activeDescription = '';
    if (totalCarTrips > 0) {
      const avgCarDistance = totalCarDistance / totalCarTrips;
      // Replaces short car trips with walking/cycling (factor = 0)
      // Switch 2 short trips a week
      const shortTripDistance = Math.min(avgCarDistance, 3.0);
      activeTravelSavings = 8 * shortTripDistance * carFactor;
      activeDescription = `Walk or cycle for short errands under 3 km. Replacing 2 weekly short car drives saves ~${activeTravelSavings.toFixed(1)} kg CO2e/month.`;
    } else {
      activeTravelSavings = 8 * 2.0 * carFactor; // 2km trip * 8 trips * 0.170 = 2.72 kg
      activeDescription = `Walk or cycle for short trips under 3 km. Replacing 2 weekly short car drives saves ~${activeTravelSavings.toFixed(1)} kg CO2e/month.`;
    }

    recommendations.push({
      title: 'Walk or Cycle Short Trips',
      description: activeDescription,
      savings: parseFloat(activeTravelSavings.toFixed(2)),
      category: 'transport',
      impact: activeTravelSavings > 30 ? 'High' : (activeTravelSavings > 10 ? 'Medium' : 'Low')
    });

    // 3. Diet: Reduce Meat
    let meatSavings = 0;
    let meatDescription = '';
    const meatFactor = EMISSION_FACTORS.food.meat;
    const produceFactor = EMISSION_FACTORS.food.produce;

    if (totalMeatQty > 0 && logCount > 0) {
      // Scale to monthly: if logs cover 14 days, multiply by 2 to get monthly
      // Let's estimate monthly meat consumption from logs
      // Find range of dates in logs
      let daysCovered = 14;
      if (logs.length > 1) {
        const dates = logs.map(l => new Date(l.scannedAt).getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        const diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 1) daysCovered = diffDays;
      }
      const monthlyMeat = (totalMeatQty / daysCovered) * 30;
      // Cut meat by 50% (replacing with produce)
      meatSavings = (monthlyMeat * 0.5) * (meatFactor - produceFactor);
      meatDescription = `Based on your purchases, you buy about ${monthlyMeat.toFixed(1)} kg of meat per month. Cutting this in half and replacing it with produce saves ~${meatSavings.toFixed(1)} kg CO2e/month.`;
    } else {
      // Default: Assume average person buys 3 kg meat per month
      const defaultMeat = 3.0;
      meatSavings = (defaultMeat * 0.5) * (meatFactor - produceFactor); // 1.5 * 19.2 = 28.8 kg
      meatDescription = `Reduce meat consumption by 50% (e.g. implementing Meatless Mondays). Replacing meat with plant-based produce saves ~${meatSavings.toFixed(1)} kg CO2e/month.`;
    }

    recommendations.push({
      title: 'Adopt a Plant-Forward Diet',
      description: meatDescription,
      savings: parseFloat(meatSavings.toFixed(2)),
      category: 'food',
      impact: meatSavings > 30 ? 'High' : (meatSavings > 10 ? 'Medium' : 'Low')
    });

    // 4. Diet: Reduce Dairy
    let dairySavings = 0;
    let dairyDescription = '';
    const dairyFactor = EMISSION_FACTORS.food.dairy;

    if (totalDairyQty > 0 && logCount > 0) {
      let daysCovered = 14;
      if (logs.length > 1) {
        const dates = logs.map(l => new Date(l.scannedAt).getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);
        const diffDays = (maxDate - minDate) / (1000 * 60 * 60 * 24);
        if (diffDays > 1) daysCovered = diffDays;
      }
      const monthlyDairy = (totalDairyQty / daysCovered) * 30;
      // Cut dairy by 30%
      dairySavings = (monthlyDairy * 0.3) * (dairyFactor - produceFactor);
      dairyDescription = `Your dairy purchases estimate to ${monthlyDairy.toFixed(1)} kg per month. Switching 30% to plant-based alternatives saves ~${dairySavings.toFixed(1)} kg CO2e/month.`;
    } else {
      const defaultDairy = 5.0; // 5 kg dairy per month default
      dairySavings = (defaultDairy * 0.3) * (dairyFactor - produceFactor); // 1.5 * 4.2 = 6.3 kg
      dairyDescription = `Switch 30% of dairy items to plant-based milks and cheeses to save ~${dairySavings.toFixed(1)} kg CO2e/month.`;
    }

    recommendations.push({
      title: 'Swap Dairy for Plant Alternatives',
      description: dairyDescription,
      savings: parseFloat(dairySavings.toFixed(2)),
      category: 'food',
      impact: dairySavings > 30 ? 'High' : (dairySavings > 10 ? 'Medium' : 'Low')
    });

    // 5. Energy Saving (10% home electricity reduction)
    const homeElectricitySavings = defaultElectricity * 0.1 * electricityFactor;
    const homeDescription = `Reducing home electricity usage by 10% (by washing clothes in cold water and switching off idle electronics) saves ~${homeElectricitySavings.toFixed(1)} kg CO2e/month in country "${country}".`;
    
    recommendations.push({
      title: 'Optimize Home Electricity',
      description: homeDescription,
      savings: parseFloat(homeElectricitySavings.toFixed(2)),
      category: 'home',
      impact: homeElectricitySavings > 30 ? 'High' : (homeElectricitySavings > 10 ? 'Medium' : 'Low')
    });

    // Sort recommendations by savings descending
    return recommendations.sort((a, b) => b.savings - a.savings);
  }
}

export const InsightsService = new InsightsServiceClass();
