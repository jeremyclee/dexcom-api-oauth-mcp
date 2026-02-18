import { Router, Request, Response } from 'express';
import { dexcomClient } from '../dexcom-client';
import { oauthManager } from '../oauth';
import { formatDateForDexcom } from '../utils';

const router = Router();

// Middleware to check authentication
const requireAuth = (req: Request, res: Response, next: Function) => {
  if (!oauthManager.isAuthenticated()) {
    return res.status(401).json({
      error: 'Not authenticated',
      message: 'Please visit /auth/login to authenticate with Dexcom',
    });
  }
  next();
};

/**
 * GET /api/glucose/current
 * Get the most recent glucose reading
 */
router.get('/glucose/current', requireAuth, async (req: Request, res: Response) => {
  try {
    const reading = await dexcomClient.getCurrentGlucose();
    
    if (!reading) {
      return res.status(404).json({
        error: 'No recent readings found',
        message: 'No glucose data available in the last 15 minutes',
      });
    }

    res.json(reading);
  } catch (error: any) {
    console.error('❌ Error fetching current glucose:', error.message);
    res.status(500).json({ error: 'Failed to fetch glucose data' });
  }
});

/**
 * GET /api/glucose/range?startDate=X&endDate=Y
 * Get glucose readings within a date range
 */
router.get('/glucose/range', requireAuth, async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'Missing parameters',
      message: 'Both startDate and endDate are required (ISO 8601 format)',
    });
  }

  try {
    const readings = await dexcomClient.getGlucoseValues(
      formatDateForDexcom(new Date(startDate as string)),
      formatDateForDexcom(new Date(endDate as string))
    );

    res.json({
      count: readings.length,
      startDate,
      endDate,
      readings,
    });
  } catch (error: any) {
    console.error('❌ Error fetching glucose range:', error.message);
    res.status(500).json({ error: 'Failed to fetch glucose data' });
  }
});

/**
 * GET /api/statistics?days=N
 * Get glucose statistics for the last N days
 */
router.get('/statistics', requireAuth, async (req: Request, res: Response) => {
  const days = parseInt(req.query.days as string) || 7;

  if (days < 1 || days > 90) {
    return res.status(400).json({
      error: 'Invalid days parameter',
      message: 'Days must be between 1 and 90',
    });
  }

  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);


    const readings = await dexcomClient.getGlucoseValues(
      formatDateForDexcom(startDate),
      formatDateForDexcom(endDate)
    );

    const statistics = dexcomClient.calculateStatistics(readings);

    if (!statistics) {
      return res.status(404).json({
        error: 'No data available',
        message: `No glucose data found for the last ${days} days`,
      });
    }

    res.json({
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      statistics,
    });
  } catch (error: any) {
    console.error('❌ Error calculating statistics:', error.message);
    res.status(500).json({ error: 'Failed to calculate statistics' });
  }
});

/**
 * GET /api/devices
 * Get user's Dexcom devices
 */
router.get('/devices', requireAuth, async (req: Request, res: Response) => {
  try {
    const devices = await dexcomClient.getDevices();
    res.json({ devices });
  } catch (error: any) {
    console.error('❌ Error fetching devices:', error.message);
    res.status(500).json({ error: 'Failed to fetch devices' });
  }
});

/**
 * GET /api/data-range
 * Get the available data range for the user
 */
router.get('/data-range', requireAuth, async (req: Request, res: Response) => {
  try {
    const dataRange = await dexcomClient.getDataRange();
    res.json(dataRange);
  } catch (error: any) {
    console.error('❌ Error fetching data range:', error.message);
    res.status(500).json({ error: 'Failed to fetch data range' });
  }
});

export default router;
