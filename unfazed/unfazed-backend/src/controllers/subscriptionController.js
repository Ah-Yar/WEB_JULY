import asyncHandler from '../utils/asyncHandler.js';
import { subscriptionOverview, switchDemoTier } from '../services/entitlementService.js';

export const getSubscription = asyncHandler(async (req, res) => {
  res.json(await subscriptionOverview(req.therapist._id));
});

// This route is intentionally available outside production so reviewers can exercise every
// entitlement without a real subscription billing account. Production billing would be the
// only writer of therapist.subscription.tierKey.
export const changeDemoTier = asyncHandler(async (req, res) => {
  const { tier } = await switchDemoTier(req.therapist._id, req.body.tierKey);
  res.json({ message: `Demo plan changed to ${tier.name}.`, ...(await subscriptionOverview(req.therapist._id)) });
});
