import express from 'express';
import multer from 'multer';
import prisma from '../prisma/client.js';
import { GeocodingService, haversineDistance } from '../services/GeocodingService.js';
import { AIBillParser } from '../services/AIBillParser.js';
import { CarbonCalcService } from '../services/CarbonCalcService.js';
import { InsightsService } from '../services/InsightsService.js';
import { EMISSION_FACTORS } from '../config/emission-factors.js';
import authMiddleware from '../config/authMiddleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply authentication middleware to all API endpoints below
router.use(authMiddleware);

// 1. Geolocation onboarding / update home location
router.post('/onboarding', async (req, res) => {
  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }

  try {
    const geoInfo = await GeocodingService.reverseGeocode(lat, lng);
    
    // Save to user table (multi-user mode)
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        homeLat: parseFloat(lat),
        homeLng: parseFloat(lng),
        country: geoInfo.countryCode,
      },
    });

    res.json({
      message: 'Onboarding completed successfully',
      user,
      geoInfo,
    });
  } catch (err) {
    console.error('Onboarding endpoint error:', err);
    res.status(500).json({ error: 'Failed to process onboarding' });
  }
});

// 2. Scan and parse receipt image
router.post('/logs/parse', upload.single('bill'), async (req, res) => {
  try {
    let buffer;
    let mimeType = 'image/jpeg';

    if (req.file) {
      buffer = req.file.buffer;
      mimeType = req.file.mimetype;
    } else if (req.body.imageBase64) {
      const base64Data = req.body.imageBase64.replace(/^data:image\/\w+;base64,/, "");
      buffer = Buffer.from(base64Data, 'base64');
      const mimeMatch = req.body.imageBase64.match(/^data:(image\/\w+);base64,/);
      if (mimeMatch) {
        mimeType = mimeMatch[1];
      }
    } else {
      return res.status(400).json({ error: 'No receipt file or image base64 provided' });
    }

    // Parse receipt with AI Bill Parser
    const parsedReceipt = await AIBillParser.parseBill(buffer, mimeType);

    // Get user's home coordinates
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const homeLat = user ? user.homeLat : 37.7749;
    const homeLng = user ? user.homeLng : -122.4194;
    const country = user ? user.country : 'US';

    // Geocode store address
    let shopLat = homeLat;
    let shopLng = homeLng;
    let distance = 0.0;
    
    let storeLoc = null;
    if (parsedReceipt.shopAddress) {
      storeLoc = await GeocodingService.geocode(parsedReceipt.shopAddress, homeLat, homeLng, country);
    }
    if (!storeLoc && parsedReceipt.shopName) {
      storeLoc = await GeocodingService.geocode(parsedReceipt.shopName, homeLat, homeLng, country);
    }

    if (storeLoc) {
      shopLat = storeLoc.lat;
      shopLng = storeLoc.lng;
      distance = haversineDistance(homeLat, homeLng, shopLat, shopLng);
    }

    // Infer travel mode
    const travelMode = CarbonCalcService.inferTravelMode(distance);

    res.json({
      shopName: parsedReceipt.shopName,
      shopAddress: parsedReceipt.shopAddress || '',
      shopLat,
      shopLng,
      distance: parseFloat(distance.toFixed(2)),
      travelMode,
      items: parsedReceipt.items || [],
      total: parsedReceipt.total || 0,
    });

  } catch (err) {
    console.error('Parse endpoint error:', err);
    res.status(400).json({ error: err.message || 'Failed to parse receipt' });
  }
});

// 3. Persist finalized log
router.post('/logs', async (req, res) => {
  const { shopName, shopAddress, shopLat, shopLng, distance, travelMode, items, scannedAt } = req.body;

  if (!shopName || !items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Shop name and items array are required' });
  }

  try {
    // Recompute emissions on server-side to guarantee consistency with variables config
    const travelEmissions = CarbonCalcService.calculateTravelEmissions(distance, travelMode);
    
    // Calculate products emissions
    const { total: productEmissions, items: calculatedItems } = CarbonCalcService.calculateProductEmissions(items);
    
    const totalEmissions = travelEmissions + productEmissions;

    const log = await prisma.log.create({
      data: {
        shopName,
        shopAddress,
        shopLat: shopLat ? parseFloat(shopLat) : null,
        shopLng: shopLng ? parseFloat(shopLng) : null,
        distance: distance ? parseFloat(distance) : 0.0,
        travelMode,
        travelEmissions: parseFloat(travelEmissions.toFixed(3)),
        productEmissions: parseFloat(productEmissions.toFixed(3)),
        totalEmissions: parseFloat(totalEmissions.toFixed(3)),
        scannedAt: scannedAt ? new Date(scannedAt) : new Date(),
        userId: req.user.id,
        items: {
          create: calculatedItems.map(item => ({
            name: item.name,
            category: item.category,
            quantity: parseFloat(item.quantity) || 1.0,
            unit: item.unit || 'pcs',
            emissions: parseFloat(item.emissions.toFixed(3)),
          })),
        },
      },
      include: {
        items: true,
      },
    });

    res.status(201).json(log);
  } catch (err) {
    console.error('Save log error:', err);
    res.status(500).json({ error: 'Failed to save carbon log entry' });
  }
});

// 4. Retrieve log entries history
router.get('/logs', async (req, res) => {
  try {
    const logs = await prisma.log.findMany({
      where: { userId: req.user.id },
      include: { items: true },
      orderBy: { scannedAt: 'desc' },
    });
    res.json(logs);
  } catch (err) {
    console.error('Get logs error:', err);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// 5. Delete carbon log
router.delete('/logs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const log = await prisma.log.findUnique({ where: { id } });
    if (!log || log.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden. You do not own this log entry.' });
    }
    await prisma.log.delete({
      where: { id },
    });
    res.json({ success: true, message: 'Log deleted successfully' });
  } catch (err) {
    console.error('Delete log error:', err);
    res.status(500).json({ error: 'Failed to delete log' });
  }
});

// 6. Get dashboard aggregates
router.get('/dashboard', async (req, res) => {
  try {
    // Get user configuration
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isOnboarded = !!(user && user.homeLat !== null && user.homeLng !== null);
    const country = user ? user.country : 'US';
    const goal = user ? user.monthlyGoal : 500.0;

    // Fetch user's logs
    const logs = await prisma.log.findMany({
      where: { userId: req.user.id },
      include: { items: true },
    });

    const now = new Date();
    
    // Start of time periods
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfWeek = new Date();
    // Monday as start of week
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let todayEmissions = 0.0;
    let weekEmissions = 0.0;
    let monthEmissions = 0.0;

    const categoryBreakdown = {
      meat: 0.0,
      dairy: 0.0,
      produce: 0.0,
      packaged_food: 0.0,
      household: 0.0,
      transport: 0.0,
      other: 0.0,
    };

    logs.forEach(log => {
      const logDate = new Date(log.scannedAt);
      const emissions = log.totalEmissions;

      if (logDate >= startOfToday) {
        todayEmissions += emissions;
      }
      if (logDate >= startOfWeek) {
        weekEmissions += emissions;
      }
      if (logDate >= startOfMonth) {
        monthEmissions += emissions;
      }

      // Add transport emissions
      categoryBreakdown.transport += log.travelEmissions;

      // Add items emissions
      log.items.forEach(item => {
        const cat = item.category;
        if (categoryBreakdown[cat] !== undefined) {
          categoryBreakdown[cat] += item.emissions;
        } else {
          categoryBreakdown.other += item.emissions;
        }
      });
    });

    // Compute trend line (last 14 days)
    const trendData = [];
    for (let i = 13; i >= 0; i--) {
      const date = new Date();
      date.setDate(now.getDate() - i);
      date.setHours(0,0,0,0);
      
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);

      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.scannedAt);
        return logDate >= date && logDate < nextDate;
      });

      const dayTotal = dayLogs.reduce((sum, l) => sum + l.totalEmissions, 0);
      
      trendData.push({
        date: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        emissions: parseFloat(dayTotal.toFixed(2)),
      });
    }

    // Confidence indicator calculation
    // More bills = higher confidence
    const billsCount = logs.length;
    let confidence = 'Low';
    let confidenceScore = 15; // out of 100
    let confidenceReason = 'Using average baseline. Scan receipts to start personalizing.';

    if (billsCount >= 1 && billsCount < 3) {
      confidence = 'Medium-Low';
      confidenceScore = 40;
      confidenceReason = 'Slightly personalized. Scan more bills to refine estimates.';
    } else if (billsCount >= 3 && billsCount < 6) {
      confidence = 'Medium';
      confidenceScore = 65;
      confidenceReason = 'Moderate accuracy. Real purchases are tracking trends well.';
    } else if (billsCount >= 6) {
      confidence = 'High';
      confidenceScore = 90;
      confidenceReason = 'Highly personalized. Emissions match your exact shopping history.';
    }

    res.json({
      today: parseFloat(todayEmissions.toFixed(2)),
      thisWeek: parseFloat(weekEmissions.toFixed(2)),
      thisMonth: parseFloat(monthEmissions.toFixed(2)),
      monthlyGoal: goal,
      categoryBreakdown,
      trendData,
      confidence: {
        level: confidence,
        score: confidenceScore,
        reason: confidenceReason,
        scannedCount: billsCount,
      },
      country,
      isOnboarded,
    });

  } catch (err) {
    console.error('Get dashboard error:', err);
    res.status(500).json({ error: 'Failed to retrieve dashboard stats' });
  }
});

// 7. Get personalized insights
router.get('/insights', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } }) || { country: 'US' };
    const logs = await prisma.log.findMany({
      where: { userId: req.user.id },
      include: { items: true },
    });

    const recommendations = InsightsService.generateRecommendations(logs, user.country);
    res.json(recommendations);
  } catch (err) {
    console.error('Get insights error:', err);
    res.status(500).json({ error: 'Failed to retrieve carbon insights' });
  }
});

// 8. Update carbon target goal
router.post('/user/goal', async (req, res) => {
  const { monthlyGoal } = req.body;
  if (monthlyGoal === undefined || monthlyGoal <= 0) {
    return res.status(400).json({ error: 'Valid goal target is required' });
  }
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { monthlyGoal: parseFloat(monthlyGoal) },
    });
    res.json({ success: true, monthlyGoal: user.monthlyGoal });
  } catch (err) {
    console.error('Update goal error:', err);
    res.status(500).json({ error: 'Failed to update monthly goal' });
  }
});

// 9. Reset database / clear all seeded logs
router.post('/logs/clear', async (req, res) => {
  try {
    // Cascade delete ensures log items are deleted when logs are deleted
    await prisma.log.deleteMany({ where: { userId: req.user.id } });
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        homeLat: null,
        homeLng: null,
        country: 'US',
      }
    });
    res.json({ success: true, message: 'User log history reset successfully' });
  } catch (err) {
    console.error('Reset database error:', err);
    res.status(500).json({ error: 'Failed to reset database' });
  }
});

export default router;
