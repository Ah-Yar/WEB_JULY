import { DateTime } from 'luxon';
import Client from '../models/Client.js';
import Payment from '../models/Payment.js';
import Session from '../models/Session.js';
import asyncHandler from '../utils/asyncHandler.js';
import AppError from '../utils/AppError.js';
import { ENTITLEMENT_KEYS, requireEntitlement, subscriptionOverview } from '../services/entitlementService.js';

function historyMonths(value) {
  const months = Number(value || 1);
  if (!Number.isInteger(months) || months < 1 || months > 60) throw new AppError('Analytics history must be between 1 and 60 months.', 422);
  return months;
}

export const getAnalytics = asyncHandler(async (req, res) => {
  const months = historyMonths(req.query.months);
  await requireEntitlement(req.therapist._id, ENTITLEMENT_KEYS.ANALYTICS_DEPTH, { requestedValue: months });
  const timezone = req.therapist.timezone || 'Asia/Kolkata';
  const now = DateTime.now().setZone(timezone);
  const from = now.startOf('month').minus({ months: months - 1 }).toUTC().toJSDate();
  const until = now.endOf('month').toUTC().toJSDate();
  const therapist = req.therapist._id;

  const [revenueRows, activeClientRows, sessionRows, subscription] = await Promise.all([
    // All revenue values are derived server-side through a MongoDB aggregation pipeline.
    Payment.aggregate([
      { $match: { therapist, status: 'captured', paidAt: { $gte: from, $lte: until } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$paidAt', timezone } }, revenue: { $sum: '$amount' }, payments: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]),
    Client.aggregate([
      { $match: { therapist, status: 'active' } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]),
    Session.aggregate([
      { $match: { therapist, startsAt: { $gte: from, $lte: until } } },
      { $group: { _id: null, total: { $sum: 1 }, noShows: { $sum: { $cond: [{ $eq: ['$status', 'no_show'] }, 1, 0] } }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } }
    ]),
    subscriptionOverview(therapist)
  ]);

  const revenueByMonth = new Map(revenueRows.map((row) => [row._id, row]));
  const revenueTrend = Array.from({ length: months }, (_, index) => {
    const date = now.startOf('month').minus({ months: months - index - 1 });
    const key = date.toFormat('yyyy-LL');
    const row = revenueByMonth.get(key);
    return { month: date.toFormat('LLL'), period: key, revenue: row?.revenue || 0, payments: row?.payments || 0 };
  });
  const sessions = sessionRows[0] || { total: 0, noShows: 0, completed: 0 };

  res.json({
    period: { months, from, until, timezone },
    metrics: {
      revenue: revenueTrend.reduce((total, item) => total + item.revenue, 0),
      activeClients: activeClientRows[0]?.count || 0,
      totalSessions: sessions.total,
      completedSessions: sessions.completed,
      noShows: sessions.noShows,
      noShowRate: sessions.total ? Number(((sessions.noShows / sessions.total) * 100).toFixed(1)) : 0
    },
    revenueTrend,
    subscription: subscription.subscription
  });
});
