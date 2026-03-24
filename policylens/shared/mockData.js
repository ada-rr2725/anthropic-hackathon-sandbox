// shared mock data — all four people develop against this contract
// import { MOCK_IMPACT_SPEC } from '../data/mockData'

export const MOCK_IMPACT_SPEC = {
  policy_title: "UK Sugar Tax on Beverages",
  policy_summary: "The UK imposes a levy on soft drinks containing more than 5g of sugar per 100ml, charged to producers and importers.",
  policy_type: "tax",
  confidence: "high",
  primary_region: { name: "United Kingdom", lat: 51.5, lon: -0.1 },
  affected_regions: [
    { name: "United Kingdom", country_code: "GBR", lat: 51.5, lon: -0.1, impact_score: 85, impact_direction: "mixed", impact_summary: "Domestic producers reformulate products; NHS benefits from reduced sugar intake long-term." },
    { name: "United States", country_code: "USA", lat: 37.1, lon: -95.7, impact_score: 45, impact_direction: "negative", impact_summary: "US beverage exporters face reduced UK market access and reformulation costs." },
    { name: "Mexico", country_code: "MEX", lat: 23.6, lon: -102.6, impact_score: 30, impact_direction: "negative", impact_summary: "Sugar cane exporters see reduced demand from UK beverage manufacturers." },
    { name: "Brazil", country_code: "BRA", lat: -14.2, lon: -51.9, impact_score: 25, impact_direction: "negative", impact_summary: "Second-order reduction in sugar export volumes to UK-linked supply chains." },
    { name: "Ireland", country_code: "IRL", lat: 53.1, lon: -8.2, impact_score: 40, impact_direction: "mixed", impact_summary: "Closely integrated UK food supply chain faces pass-through reformulation costs." },
    { name: "Australia", country_code: "AUS", lat: -25.3, lon: 133.8, impact_score: 20, impact_direction: "positive", impact_summary: "Stevia and natural sweetener producers see increased export demand." },
  ],
  trade_routes: [
    { from_name: "Mexico", from_lat: 23.6, from_lon: -102.6, to_name: "United Kingdom", to_lat: 51.5, to_lon: -0.1, route_type: "disrupted", commodity: "Raw Sugar", magnitude: 40 },
    { from_name: "United States", from_lat: 37.1, from_lon: -95.7, to_name: "United Kingdom", to_lat: 51.5, to_lon: -0.1, route_type: "disrupted", commodity: "Beverage Exports", magnitude: 45 },
    { from_name: "Australia", from_lat: -25.3, from_lon: 133.8, to_name: "United Kingdom", to_lat: 51.5, to_lon: -0.1, route_type: "new", commodity: "Natural Sweeteners", magnitude: 30 },
  ],
  demographics: [
    { group: "Low-income households", impact_score: -35, primary_regions: ["GBR"], key_effect: "Disproportionate price increase on affordable soft drinks as a share of household income." },
    { group: "Children and young people", impact_score: 60, primary_regions: ["GBR"], key_effect: "Reduced sugar consumption linked to lower obesity and dental health costs long-term." },
    { group: "Beverage industry workers", impact_score: -25, primary_regions: ["GBR", "USA"], key_effect: "Reformulation investments may cause short-term job losses in high-sugar product lines." },
    { group: "NHS and healthcare system", impact_score: 70, primary_regions: ["GBR"], key_effect: "Projected savings in diabetes and obesity treatment over 10 years." },
    { group: "Stevia/sweetener producers", impact_score: 55, primary_regions: ["AUS", "CHN"], key_effect: "Demand for sugar alternatives rises sharply as manufacturers reformulate." },
  ],
  timeline: [
    { period: "0-3 months", label: "Producers announce reformulation plans; initial price rises in shops", severity: 40 },
    { period: "3-12 months", label: "Peak price impact on consumers; some smaller producers exit market", severity: 70 },
    { period: "1-3 years", label: "Reformulation largely complete; sugar content in beverages falls industry-wide", severity: 45 },
    { period: "3-10 years", label: "Public health benefits materialise; NHS cost savings become measurable", severity: 20 },
    { period: "10+ years", label: "Policy considered success; other countries consider similar legislation", severity: 10 },
  ],
  knockon_graph: {
    nodes: [
      { id: "trigger", label: "UK Sugar Tax Introduced", type: "trigger", sentiment: "neutral" },
      { id: "price_rise", label: "Beverage Prices Rise", type: "economic", sentiment: "negative" },
      { id: "reformulation", label: "Manufacturers Reformulate", type: "economic", sentiment: "neutral" },
      { id: "sugar_demand", label: "Sugar Import Demand Falls", type: "economic", sentiment: "negative" },
      { id: "sweetener_demand", label: "Sweetener Demand Rises", type: "economic", sentiment: "positive" },
      { id: "consumption_drop", label: "Consumer Sugar Intake Drops", type: "social", sentiment: "positive" },
      { id: "health_benefit", label: "Obesity/Diabetes Rates Fall", type: "outcome", sentiment: "positive" },
      { id: "nhs_saving", label: "NHS Cost Savings", type: "outcome", sentiment: "positive" },
      { id: "regressive_impact", label: "Disproportionate Burden on Low-Income", type: "social", sentiment: "negative" },
      { id: "policy_diffusion", label: "Other Countries Adopt Similar Laws", type: "political", sentiment: "positive" },
    ],
    edges: [
      { source: "trigger", target: "price_rise", label: "levy passed to consumer", strength: 0.9 },
      { source: "trigger", target: "reformulation", label: "tax avoidance incentive", strength: 0.85 },
      { source: "reformulation", target: "sugar_demand", label: "less sugar needed", strength: 0.7 },
      { source: "reformulation", target: "sweetener_demand", label: "substitution", strength: 0.65 },
      { source: "price_rise", target: "consumption_drop", label: "price elasticity", strength: 0.6 },
      { source: "reformulation", target: "consumption_drop", label: "lower sugar content", strength: 0.75 },
      { source: "consumption_drop", target: "health_benefit", label: "reduced intake over years", strength: 0.7 },
      { source: "health_benefit", target: "nhs_saving", label: "fewer treatments needed", strength: 0.8 },
      { source: "price_rise", target: "regressive_impact", label: "% of low income spent on drinks", strength: 0.65 },
      { source: "nhs_saving", target: "policy_diffusion", label: "evidence base for other govts", strength: 0.5 },
    ],
  },
  social_impacts: [
    { group: "Low-income families", sentiment: "negative", headline: "Cheap treats get quietly more expensive", detail: "Soft drinks represent a higher share of spending for lower-income households. A 20% price rise on a 50p can hits harder proportionally than on a smoothie. The tax is not means-tested and there is no offsetting rebate.", magnitude: "high" },
    { group: "Children", sentiment: "positive", headline: "Less sugar in the school canteen fridge", detail: "Manufacturers reformulate flagship products to avoid the levy, meaning the same brands children already consume simply contain less sugar. This requires no behaviour change, the food environment changes around them.", magnitude: "high" },
    { group: "Beverage industry workers", sentiment: "mixed", headline: "Factory lines shift to lower-sugar production", detail: "Short-term disruption as production lines are adapted. Some high-sugar specialist products are discontinued. However the overall industry does not shrink, it reformulates, maintaining most employment.", magnitude: "medium" },
    { group: "Dentists and GPs", sentiment: "positive", headline: "Fewer cavities, fewer referrals over time", detail: "Sugar is a primary driver of tooth decay and type 2 diabetes. Modelling suggests a sustained reduction in dental procedures and diabetes prescriptions within a decade, reducing professional workload in these areas.", magnitude: "medium" },
  ],
  kpis: {
    countries_affected: 6,
    people_affected: "67M directly, 200M+ via trade",
    gdp_impact_usd: "-$1.2B (short term) / +$4B (10yr health savings)",
    timeline_to_peak: "3-12 months",
    reversibility: "moderate",
  },
  ethical_notes: [
    "This analysis treats manufacturer reformulation as likely based on UK experience post-2018. Actual reformulation pace varies significantly by company size.",
    "The regressive impact on low-income households is real and documented. Any presentation of this tool should acknowledge this trade-off rather than presenting the tax as purely beneficial.",
    "Long-term health projections carry significant uncertainty. They depend on sustained dietary behaviour change which is difficult to model.",
  ],
};

export const EMPTY_IMPACT_SPEC = null;

export const MOCK_ERROR_RESPONSE = {
  error: "cannot_analyse",
  reason: "The input describes an action intended to cause direct harm to specific individuals.",
};
