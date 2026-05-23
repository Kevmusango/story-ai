// ============================================================
// TARGETING CONSTANTS
// Single source of truth for personas, emotional angles,
// industry buckets, and content goals.
// ============================================================

// ------------------------------------------------------------
// CONTENT GOAL
// Controls the entire tone of the generated script.
// ------------------------------------------------------------

export const CONTENT_GOALS = [
  {
    id: "organic" as const,
    label: "Organic Content",
    description: "TikTok, Reels, Shorts, WhatsApp Status",
    tone: "Educational authority. No hard sell. Build trust daily.",
    badge: "Free Post",
    color: "#22d3ee",
  },
  {
    id: "paid_ad" as const,
    label: "Paid Ad",
    description: "Facebook Ads, Instagram Ads, Google Display",
    tone: "High urgency. Direct problem-solution. Hard CTA.",
    badge: "Paid Ad",
    color: "#c8ff00",
  },
] as const;

export type ContentGoalId = (typeof CONTENT_GOALS)[number]["id"];

// ------------------------------------------------------------
// INDUSTRY BUCKETS
// Auto-assigned by Google Vision label mapping.
// Never shown as a user-facing dropdown — assigned silently.
// ------------------------------------------------------------

export const INDUSTRY_BUCKETS = [
  { id: "automotive",            label: "Automotive & Transport",    visionKeywords: ["vehicle", "automobile", "car", "brake", "engine", "tire", "truck", "motorcycle"] },
  { id: "fashion_retail",        label: "Fashion & Retail",          visionKeywords: ["clothing", "fashion", "apparel", "boutique", "textile", "dress", "shoe", "bag", "jewelry"] },
  { id: "home_services",         label: "Home Services & Repair",    visionKeywords: ["plumbing", "pipe", "ceiling", "wall", "roof", "electrical", "paint", "tile", "hammer"] },
  { id: "food_beverage",         label: "Food & Beverage",           visionKeywords: ["food", "restaurant", "meal", "drink", "coffee", "bakery", "cuisine", "plate", "kitchen"] },
  { id: "healthcare_wellness",   label: "Healthcare & Wellness",     visionKeywords: ["medical", "health", "clinic", "doctor", "pharmacy", "hospital", "stethoscope", "medicine"] },
  { id: "beauty_cosmetics",      label: "Beauty & Cosmetics",        visionKeywords: ["cosmetics", "beauty", "skincare", "makeup", "serum", "lipstick", "salon", "nail", "hair"] },
  { id: "fitness_sports",        label: "Fitness & Sports",          visionKeywords: ["gym", "fitness", "exercise", "sport", "workout", "muscle", "yoga", "running", "weight"] },
  { id: "real_estate",           label: "Real Estate & Property",    visionKeywords: ["house", "property", "building", "architecture", "apartment", "interior", "room", "estate"] },
  { id: "professional_services", label: "Professional Services",     visionKeywords: ["office", "laptop", "document", "desk", "meeting", "business", "suit", "corporate"] },
  { id: "education",             label: "Education & Training",      visionKeywords: ["book", "classroom", "school", "student", "learn", "university", "teacher", "pen"] },
  { id: "technology",            label: "Technology & Electronics",  visionKeywords: ["technology", "phone", "computer", "screen", "device", "software", "gadget", "circuit"] },
  { id: "entertainment_events",  label: "Entertainment & Events",    visionKeywords: ["entertainment", "concert", "event", "stage", "music", "party", "venue", "crowd"] },
] as const;

export type IndustryBucketId = (typeof INDUSTRY_BUCKETS)[number]["id"];

/**
 * Maps raw Google Vision labels to a macro industry bucket ID.
 * Returns null if no match — GPT-4o will handle classification as fallback.
 */
export function mapVisionLabelsToIndustry(labels: string[]): IndustryBucketId | null {
  const normalized = labels.map((l) => l.toLowerCase());
  let bestMatch: { id: IndustryBucketId; score: number } | null = null;

  for (const bucket of INDUSTRY_BUCKETS) {
    const score = bucket.visionKeywords.filter((kw) =>
      normalized.some((label) => label.includes(kw))
    ).length;

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { id: bucket.id, score };
    }
  }

  return bestMatch?.id ?? null;
}

// ------------------------------------------------------------
// UNIVERSAL PERSONAS — 20 global archetypes
// These transcend geography. The same persona exists in
// Johannesburg, London, New York, and Tokyo.
// ------------------------------------------------------------

export const PERSONAS = [
  {
    id: "daily_commuter",
    label: "Daily Commuter / Transport Operator",
    coreEmotion: "Financial Stress & Vehicle Uptime",
    painPoint: "Every hour the vehicle is broken, income stops.",
    desiredOutcome: "Fast, affordable fix so they can get back to earning.",
    powerWords: ["income", "back on the road", "same-day", "affordable", "no downtime"],
    topIndustries: ["automotive", "home_services"],
  },
  {
    id: "worried_parent",
    label: "Worried Parent / Family Safety",
    coreEmotion: "Protective Fear",
    painPoint: "Terrified of a breakdown, accident, or hazard affecting their children.",
    desiredOutcome: "Certainty that their family is protected.",
    powerWords: ["safe", "protect", "your kids", "peace of mind", "before it's too late"],
    topIndustries: ["automotive", "home_services", "healthcare_wellness"],
  },
  {
    id: "first_time_buyer",
    label: "First-Time Buyer / Budget Student",
    coreEmotion: "Lack of Trust & Fear of Being Scammed",
    painPoint: "They don't know enough to know if they're being ripped off.",
    desiredOutcome: "A trustworthy expert who explains things clearly and fairly.",
    powerWords: ["honest", "no hidden fees", "we explain everything", "first-time", "simple"],
    topIndustries: ["automotive", "real_estate", "professional_services"],
  },
  {
    id: "busy_corporate",
    label: "Busy Corporate Professional",
    coreEmotion: "Time Scarcity",
    painPoint: "Their time is worth more than the problem costs — friction is the enemy.",
    desiredOutcome: "Zero-friction, premium service that respects their schedule.",
    powerWords: ["same-day", "we come to you", "one call", "done by lunchtime", "hassle-free"],
    topIndustries: ["automotive", "healthcare_wellness", "professional_services", "beauty_cosmetics"],
  },
  {
    id: "working_mother",
    label: "Working Mother / Time-Scarce Parent",
    coreEmotion: "Overwhelm & Guilt",
    painPoint: "Juggling work and family, every task she can delegate is a relief.",
    desiredOutcome: "Something off her plate that she doesn't have to think about.",
    powerWords: ["we handle it", "drop-off available", "while you're at work", "one less thing"],
    topIndustries: ["fashion_retail", "beauty_cosmetics", "home_services", "food_beverage"],
  },
  {
    id: "retired_homeowner",
    label: "Retired Homeowner / Fixed Income Senior",
    coreEmotion: "Security & Value",
    painPoint: "Fixed income means every rand/dollar must count. Fear of being overcharged.",
    desiredOutcome: "Trusted, fair-priced service from someone who respects them.",
    powerWords: ["pensioner discount", "free inspection", "honest quote", "no pressure", "trusted"],
    topIndustries: ["home_services", "healthcare_wellness", "automotive"],
  },
  {
    id: "young_entrepreneur",
    label: "Young Entrepreneur / Side Hustler",
    coreEmotion: "Ambition & Status",
    painPoint: "Wants to look established before they actually are.",
    desiredOutcome: "Tools and appearances that make them look like they've already made it.",
    powerWords: ["level up", "professional", "scale", "growth", "build your brand"],
    topIndustries: ["fashion_retail", "technology", "professional_services"],
  },
  {
    id: "fitness_seeker",
    label: "Fitness-Conscious Health Seeker",
    coreEmotion: "Confidence & Body Image",
    painPoint: "Inconsistent results despite consistent effort — feeling stuck.",
    desiredOutcome: "A visible, measurable transformation they can show others.",
    powerWords: ["results in 30 days", "transformation", "your body deserves", "before and after"],
    topIndustries: ["fitness_sports", "healthcare_wellness", "beauty_cosmetics"],
  },
  {
    id: "bride_event_planner",
    label: "Bride-to-Be / Event Planner",
    coreEmotion: "Perfectionism & Deadline Pressure",
    painPoint: "Everything must be flawless and on time — failure is not an option.",
    desiredOutcome: "A vendor they can 100% trust to deliver under pressure.",
    powerWords: ["wedding-ready", "on your big day", "guaranteed", "zero stress", "perfect"],
    topIndustries: ["beauty_cosmetics", "fashion_retail", "food_beverage", "entertainment_events"],
  },
  {
    id: "property_owner",
    label: "Property Owner / Landlord",
    coreEmotion: "Risk Management & ROI",
    painPoint: "A small problem ignored becomes a massive repair bill.",
    desiredOutcome: "Protect and grow the value of their asset.",
    powerWords: ["protect your investment", "before it spreads", "property value", "prevent damage"],
    topIndustries: ["home_services", "real_estate"],
  },
  {
    id: "small_business_owner",
    label: "Small Business Owner / Shop Owner",
    coreEmotion: "Cash Flow & Competition",
    painPoint: "Bigger competitors are eating their market share and they need an edge.",
    desiredOutcome: "More foot traffic, leads, and loyal repeat customers.",
    powerWords: ["more customers", "local business", "your community", "beat the big guys"],
    topIndustries: ["food_beverage", "fashion_retail", "professional_services"],
  },
  {
    id: "content_creator",
    label: "Social Media Creator / Influencer",
    coreEmotion: "Relevance & Engagement",
    painPoint: "The algorithm keeps changing — their growth has plateaued.",
    desiredOutcome: "Fresh, engaging content that stops the scroll and grows their audience.",
    powerWords: ["viral", "stop the scroll", "grow your audience", "trending", "10x engagement"],
    topIndustries: ["entertainment_events", "fashion_retail", "beauty_cosmetics"],
  },
  {
    id: "essential_worker",
    label: "Healthcare Worker / Essential Worker",
    coreEmotion: "Fatigue & Appreciation",
    painPoint: "They give everything to others — they want something designed for them.",
    desiredOutcome: "To feel seen, valued, and taken care of for once.",
    powerWords: ["you deserve this", "made for you", "because you give so much", "recharge"],
    topIndustries: ["healthcare_wellness", "beauty_cosmetics", "food_beverage", "fitness_sports"],
  },
  {
    id: "college_student",
    label: "College Student / Young Adult",
    coreEmotion: "Independence & Belonging",
    painPoint: "Tight budget, trying to find identity and fit in socially.",
    desiredOutcome: "Affordable access to things that make them feel like they belong.",
    powerWords: ["student discount", "affordable", "your people", "starter-friendly", "no experience needed"],
    topIndustries: ["fashion_retail", "food_beverage", "fitness_sports", "technology"],
  },
  {
    id: "fashion_conscious",
    label: "Fashion-Conscious Professional",
    coreEmotion: "Image & Social Status",
    painPoint: "They are judged by how they look before they even speak.",
    desiredOutcome: "To project power, taste, and success through their appearance.",
    powerWords: ["elevated", "premium", "wear what you mean", "first impressions", "curated"],
    topIndustries: ["fashion_retail", "beauty_cosmetics"],
  },
  {
    id: "homemaker",
    label: "Homemaker / Domestic Manager",
    coreEmotion: "Efficiency & Family Pride",
    painPoint: "Responsible for everything at home — needs things to work reliably.",
    desiredOutcome: "A well-run home she can be proud of without exhausting herself.",
    powerWords: ["for your home", "the whole family", "reliable", "easy to use", "spotless"],
    topIndustries: ["home_services", "food_beverage", "beauty_cosmetics"],
  },
  {
    id: "sports_fan",
    label: "Sports Fan / Active Lifestyle",
    coreEmotion: "Passion & Identity",
    painPoint: "Their hobby is a core part of their identity — they want the best for it.",
    desiredOutcome: "Gear, services, and experiences that honour their passion.",
    powerWords: ["built for performance", "game day ready", "serious about it", "for the dedicated"],
    topIndustries: ["fitness_sports", "fashion_retail", "food_beverage"],
  },
  {
    id: "tech_millennial",
    label: "Tech-Savvy Millennial",
    coreEmotion: "Convenience & Innovation",
    painPoint: "They expect every interaction to be instant, digital, and frictionless.",
    desiredOutcome: "A modern, seamless experience that respects their intelligence.",
    powerWords: ["instant", "app-based", "no queues", "book online", "automated", "smart"],
    topIndustries: ["technology", "professional_services", "automotive"],
  },
  {
    id: "budget_shopper",
    label: "Budget-Conscious Shopper",
    coreEmotion: "Savings & Smart Decisions",
    painPoint: "Every purchase must be justified — they research before committing.",
    desiredOutcome: "The best possible quality for the lowest justifiable price.",
    powerWords: ["best value", "compare the price", "you won't find cheaper", "smart choice", "sale"],
    topIndustries: ["fashion_retail", "food_beverage", "automotive", "home_services"],
  },
  {
    id: "local_community",
    label: "Local Community Member / Loyal Local",
    coreEmotion: "Trust & Local Pride",
    painPoint: "Big corporations feel faceless — they want to support someone they know.",
    desiredOutcome: "A local business that treats them like a neighbour, not a transaction.",
    powerWords: ["local", "community", "family-owned", "your neighbourhood", "trusted for years"],
    topIndustries: ["food_beverage", "home_services", "healthcare_wellness"],
  },
] as const;

export type PersonaId = (typeof PERSONAS)[number]["id"];

// ------------------------------------------------------------
// EMOTIONAL ANGLES — 5 psychological hooks
// These are the 5 variations generated per project.
// The data loop tracks which angle_id gets downloaded most.
// ------------------------------------------------------------

export const EMOTIONAL_ANGLES = [
  {
    id: "fear_risk",
    label: "Fear & Risk",
    emoji: "⚠️",
    description: "Highlight the danger, damage, or negative consequence of NOT acting.",
    organicTone: "Educational warning — 'here's what most people don't know about this...'",
    paidTone: "Urgent problem-agitation — 'this is happening right now and you're at risk'",
    hookFormula: "If you're ignoring [problem], here's exactly what happens next...",
    color: "#ef4444",
  },
  {
    id: "cost_saving",
    label: "Cost-Saving & Budget",
    emoji: "💰",
    description: "Lead with financial logic — savings, value, and avoiding expensive mistakes.",
    organicTone: "Financial education — 'the real cost most people don't calculate...'",
    paidTone: "Direct offer — 'pay less, get more, here's the exact number'",
    hookFormula: "Most [persona] are overpaying for [problem] by [amount/timeframe]...",
    color: "#22c55e",
  },
  {
    id: "confidence_status",
    label: "Confidence & Status",
    emoji: "⭐",
    description: "Sell the transformation — how they'll look, feel, and be perceived after.",
    organicTone: "Aspirational inspiration — 'imagine walking into [place] and...'",
    paidTone: "Desire-amplification — 'this is what [elevated version of them] looks like'",
    hookFormula: "Imagine walking into [situation] knowing you [positive outcome]...",
    color: "#a78bfa",
  },
  {
    id: "time_convenience",
    label: "Time & Convenience",
    emoji: "⚡",
    description: "Eliminate friction — the fastest, easiest, most effortless path to the outcome.",
    organicTone: "Life-hack format — 'here's how busy [persona] solves this in 10 minutes'",
    paidTone: "Speed offer — 'same-day / instant / done before lunch, book now'",
    hookFormula: "What if you could [desired outcome] in [short timeframe] without [hated task]?",
    color: "#f59e0b",
  },
  {
    id: "community_belonging",
    label: "Community & Belonging",
    emoji: "🤝",
    description: "Social proof, FOMO, and the pull of being part of something bigger.",
    organicTone: "Community spotlight — 'why [local group / type of person] chooses this'",
    paidTone: "FOMO close — 'join [number] [persona] who already made the switch'",
    hookFormula: "Join [number] [local group] who already [positive outcome] — here's why...",
    color: "#38bdf8",
  },
] as const;

export type EmotionalAngleId = (typeof EMOTIONAL_ANGLES)[number]["id"];

// ------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------

export function getPersona(id: PersonaId) {
  return PERSONAS.find((p) => p.id === id)!;
}

export function getAngle(id: EmotionalAngleId) {
  return EMOTIONAL_ANGLES.find((a) => a.id === id)!;
}

export function getIndustry(id: IndustryBucketId) {
  return INDUSTRY_BUCKETS.find((b) => b.id === id)!;
}

export function getContentGoal(id: ContentGoalId) {
  return CONTENT_GOALS.find((g) => g.id === id)!;
}

/**
 * Returns personas most relevant to a given industry bucket.
 * Used to pre-filter the persona dropdown for better UX.
 */
export function getPersonasForIndustry(industryId: IndustryBucketId) {
  return PERSONAS.filter((p) =>
    (p.topIndustries as readonly string[]).includes(industryId)
  );
}
