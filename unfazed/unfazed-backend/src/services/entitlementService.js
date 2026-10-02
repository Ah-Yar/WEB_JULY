import Client from '../models/Client.js';
import SubscriptionTierConfig from '../models/SubscriptionTierConfig.js';
import Therapist from '../models/Therapist.js';
import AppError from '../utils/AppError.js';

export const ENTITLEMENT_KEYS = Object.freeze({
  ACTIVE_CLIENTS: 'active_clients',
  STRUCTURED_NOTE_TEMPLATES: 'structured_note_templates',
  ANALYTICS_DEPTH: 'analytics_depth'
});

// These records are configuration defaults, not billing rules. No monetary values are stored
// in the code path that authorizes a feature.
const DEFAULT_TIER_CONFIGS = [
  {
    key: 'starter', name: 'Starter', description: 'Core tools for getting a private practice online.', sortOrder: 10,
    caps: { activeClients: 3, analyticsHistoryMonths: 1 },
    featureFlags: { structuredNoteTemplates: false, advancedAnalytics: false }
  },
  {
    key: 'professional', name: 'Professional', description: 'More capacity and deeper practice insights.', sortOrder: 20,
    caps: { activeClients: 25, analyticsHistoryMonths: 6 },
    featureFlags: { structuredNoteTemplates: true, advancedAnalytics: true }
  },
  {
    key: 'practice', name: 'Practice', description: 'Expanded tools for a growing practice.', sortOrder: 30,
    caps: { activeClients: 200, analyticsHistoryMonths: 24 },
    featureFlags: { structuredNoteTemplates: true, advancedAnalytics: true }
  }
];

export async function ensureTierConfigs() {
  await Promise.all(DEFAULT_TIER_CONFIGS.map((config) => SubscriptionTierConfig.updateOne(
    { key: config.key },
    { $setOnInsert: config },
    { upsert: true, runValidators: true }
  )));
}

async function subscriptionFor(therapistId) {
  const therapist = await Therapist.findById(therapistId).select('subscription');
  if (!therapist) throw new AppError('Therapist account not found.', 404);
  await ensureTierConfigs();
  let tier = await SubscriptionTierConfig.findOne({ key: therapist.subscription?.tierKey || 'starter', isActive: true });
  if (!tier) tier = await SubscriptionTierConfig.findOne({ key: 'starter', isActive: true });
  if (!tier) throw new AppError('No active subscription tier is configured.', 503);
  return { therapist, tier };
}

function nextTier(tier, tiers) {
  return tiers.find((item) => item.sortOrder > tier.sortOrder) || null;
}

/**
 * Returns the access decision plus enough context for a client to render an upgrade prompt.
 * Controllers must use this service rather than inspecting a tier name themselves.
 */
export async function getEntitlement(therapistId, featureKey, { requestedValue } = {}) {
  const { tier } = await subscriptionFor(therapistId);
  const tiers = await SubscriptionTierConfig.find({ isActive: true }).sort({ sortOrder: 1 });
  const base = { featureKey, tier: { key: tier.key, name: tier.name }, allowed: false };

  if (featureKey === ENTITLEMENT_KEYS.ACTIVE_CLIENTS) {
    const usage = await Client.countDocuments({ therapist: therapistId, status: 'active' });
    const limit = tier.caps.activeClients;
    return { ...base, allowed: usage < limit, usage, limit, unit: 'active clients', nextTier: nextTier(tier, tiers) && { key: nextTier(tier, tiers).key, name: nextTier(tier, tiers).name } };
  }

  if (featureKey === ENTITLEMENT_KEYS.STRUCTURED_NOTE_TEMPLATES) {
    return { ...base, allowed: Boolean(tier.featureFlags.structuredNoteTemplates), nextTier: nextTier(tier, tiers) && { key: nextTier(tier, tiers).key, name: nextTier(tier, tiers).name } };
  }

  if (featureKey === ENTITLEMENT_KEYS.ANALYTICS_DEPTH) {
    const limit = tier.caps.analyticsHistoryMonths;
    const requested = Math.max(1, Number(requestedValue) || 1);
    return { ...base, allowed: requested <= limit, usage: requested, limit, unit: 'months of analytics history', nextTier: nextTier(tier, tiers) && { key: nextTier(tier, tiers).key, name: nextTier(tier, tiers).name } };
  }

  throw new AppError(`Unknown entitlement feature: ${featureKey}`, 500);
}

/** Boolean API for use by code that only needs an allow/deny decision. */
export async function canAccess(therapistId, featureKey, options = {}) {
  return (await getEntitlement(therapistId, featureKey, options)).allowed;
}

export async function requireEntitlement(therapistId, featureKey, options = {}) {
  const entitlement = await getEntitlement(therapistId, featureKey, options);
  if (entitlement.allowed) return entitlement;

  const upgrade = {
    featureKey,
    currentTier: entitlement.tier,
    ...(entitlement.nextTier ? { recommendedTier: entitlement.nextTier } : {}),
    ...(entitlement.limit !== undefined ? { limit: entitlement.limit, usage: entitlement.usage, unit: entitlement.unit } : {})
  };
  throw new AppError(
    entitlement.limit !== undefined
      ? `Your ${entitlement.tier.name} plan allows ${entitlement.limit} ${entitlement.unit === 'months of analytics history' && entitlement.limit === 1 ? 'month of analytics history' : entitlement.unit}.`
      : `This feature is not included in your ${entitlement.tier.name} plan.`,
    403,
    { code: 'ENTITLEMENT_REQUIRED', upgrade }
  );
}

export async function subscriptionOverview(therapistId) {
  const { therapist, tier } = await subscriptionFor(therapistId);
  const [activeClientCount, tiers] = await Promise.all([
    Client.countDocuments({ therapist: therapist._id, status: 'active' }),
    SubscriptionTierConfig.find({ isActive: true }).sort({ sortOrder: 1 }).select('key name description caps featureFlags sortOrder')
  ]);
  return {
    subscription: {
      tier: { key: tier.key, name: tier.name, description: tier.description },
      status: therapist.subscription?.status || 'active',
      entitlements: {
        activeClients: { used: activeClientCount, limit: tier.caps.activeClients },
        analyticsHistoryMonths: tier.caps.analyticsHistoryMonths,
        structuredNoteTemplates: Boolean(tier.featureFlags.structuredNoteTemplates),
        advancedAnalytics: Boolean(tier.featureFlags.advancedAnalytics)
      }
    },
    tiers
  };
}

export async function switchDemoTier(therapistId, tierKey) {
  if (process.env.NODE_ENV === 'production') throw new AppError('Plan changes are managed through billing in production.', 403);
  await ensureTierConfigs();
  const tier = await SubscriptionTierConfig.findOne({ key: String(tierKey || '').toLowerCase(), isActive: true });
  if (!tier) throw new AppError('That subscription tier is not available.', 404);
  const therapist = await Therapist.findByIdAndUpdate(
    therapistId,
    { $set: { 'subscription.tierKey': tier.key, 'subscription.status': 'active', 'subscription.changedAt': new Date() } },
    { new: true }
  );
  return { therapist, tier };
}
