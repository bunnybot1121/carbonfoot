/**
 * EcoTrack Emission Factors Configuration
 * 
 * Sources & Citations:
 * - IPCC: Intergovernmental Panel on Climate Change (Fifth Assessment Report)
 * - DEFRA: UK Department for Environment, Food & Rural Affairs (2023 Greenhouse Gas Conversion Factors)
 * - OurWorldInData: Environmental Impacts of Food Production (Poore & Nemecek, 2018)
 * - IEA: International Energy Agency (CO2 Emissions from Fuel Combustion)
 * - EPA: US Environmental Protection Agency (eGRID 2023)
 */

export const EMISSION_FACTORS = {
  // Transport factors in kg CO2e per km
  // Source: DEFRA 2023 / EPA
  transport: {
    walking: 0.0,    // 0 g CO2e/km
    cycling: 0.0,    // 0 g CO2e/km
    transit: 0.035,  // 35 g CO2e/km (average for bus/train/light rail)
    car: 0.170,      // 170 g CO2e/km (average petrol/diesel passenger car)
    flight: 0.115,   // 115 g CO2e/km (short/long haul economy average)
  },

  // Food and product categories in kg CO2e per kg
  // Source: Our World in Data (Poore & Nemecek 2018) / DEFRA
  food: {
    meat: 20.0,             // Weighted average for beef (~60), pork (~7), poultry (~6)
    dairy: 5.0,             // Average for cheese (~21), milk (~3), butter (~12)
    produce: 0.8,           // Average for fruits, vegetables, grains
    packaged_food: 2.0,      // Processed food lifecycle average
    household: 1.2,         // Cleaning supplies, toiletries, paper towels
    other: 1.5,             // Fallback/average product factor
  },

  // Home electricity grids in kg CO2e per kWh
  // Source: IEA / EPA eGRID / DEFRA
  electricityByCountry: {
    US: 0.370,   // US EPA eGRID 2023 average
    GB: 0.150,   // UK DEFRA 2023 grid factor
    DE: 0.380,   // Germany EEA average
    IN: 0.710,   // India CEA grid factor
    CA: 0.120,   // Canada low-carbon (hydro/nuclear) mix
    FR: 0.050,   // France nuclear-heavy mix
    DEFAULT: 0.475, // World average grid factor (IEA)
  },

  // Home natural gas in kg CO2e per kWh
  // Source: DEFRA 2023
  gas: 0.180, // Natural gas combustion factor

  // Average household monthly consumptions for fallback footprints (when no user bills exist)
  // Source: US EIA / UK Ofgem (normalized per person)
  householdAverages: {
    electricity_kwh: 300, // per person monthly average
    gas_kwh: 400,         // per person monthly average
  }
};

// Distance thresholds in km for inferring travel mode from receipt store location
// <= 1km: walking, 1-3km: bike/walk, 3-15km: transit (ambiguous), >15km: car
export const DISTANCE_THRESHOLDS = {
  walkingMax: 1.0,
  bikeMax: 3.0,
  transitMax: 15.0,
};

// Map keywords in items to their categories (English + German/multilingual support)
export const PRODUCT_KEYWORD_MAP = {
  meat: ['beef', 'chicken', 'pork', 'steak', 'meat', 'ham', 'bacon', 'turkey', 'lamb', 'sausage', 'salmon', 'fish', 'tuna', 'seafood', 'shrimp', 'schweinshax', 'schwein', 'rind', 'hähnchen', 'puten', 'fleisch', 'wurst', 'salami'],
  dairy: ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'dairy', 'egg', 'eggs', 'margarine', 'milch', 'käse', 'joghurt', 'sahne', 'eier', 'quark'],
  produce: ['apple', 'banana', 'orange', 'onion', 'tomato', 'potato', 'lettuce', 'fruit', 'vegetable', 'veg', 'grape', 'spinach', 'berry', 'berries', 'lemon', 'lime', 'garlic', 'carrot', 'carrots', 'salad', 'apfel', 'banane', 'zwiebel', 'tomate', 'kartoffel', 'knödel', 'gemüse', 'obst', 'salat', 'karotte', 'zitrone'],
  packaged_food: ['cereal', 'chip', 'chips', 'cookie', 'cookies', 'bread', 'pasta', 'rice', 'sauce', 'soup', 'bean', 'beans', 'coke', 'soda', 'beverage', 'juice', 'snack', 'snacks', 'chocolate', 'candy', 'noodle', 'noodles', 'pizza', 'frozen', 'beer', 'weizenbier', 'bier', 'wein', 'wasser', 'brot', 'limo', 'cola', 'keks', 'nudeln', 'reis', 'suppe', 'brötchen'],
  household: ['soap', 'detergent', 'cleaner', 'shampoo', 'tissue', 'paper', 'napkin', 'wipes', 'brush', 'toothpaste', 'foil', 'bag', 'bags', 'battery', 'batteries', 'seife', 'spülmittel', 'reiniger', 'papier', 'taschentuch', 'servietten'],
};
