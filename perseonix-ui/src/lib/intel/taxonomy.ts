// Shared intel taxonomy: sectors + a country/region gazetteer. Used to extract
// structured targeting from free text and to power the relevance engine. Kept
// framework-agnostic (no server-only) so both server extraction and client
// selectors can import it.

export type SectorKey =
  | "government"
  | "defense"
  | "aerospace"
  | "energy"
  | "financial"
  | "healthcare"
  | "technology"
  | "telecom"
  | "manufacturing"
  | "transportation"
  | "education"
  | "media"
  | "ngo"
  | "critical_infra"
  | "pharma"
  | "retail"
  | "legal"
  | "hospitality"
  | "maritime"
  | "crypto"

export type Sector = { key: SectorKey; label: string; synonyms: string[] }

// Order roughly by prominence. Synonyms are lowercase substrings matched in prose.
export const SECTORS: Sector[] = [
  { key: "government", label: "Government", synonyms: ["government", "public sector", "state agenc", "ministr", "diplomat", "embass", "political", "election", "municipal"] },
  { key: "defense", label: "Defense & Military", synonyms: ["defense", "defence", "military", "armed forces", "army", "navy", "air force", "weapons", "arms manufactur"] },
  { key: "aerospace", label: "Aerospace", synonyms: ["aerospace", "aviation", "space", "satellite", "airline"] },
  { key: "energy", label: "Energy & Utilities", synonyms: ["energy", "oil", "gas", "petroleum", "power grid", "electric", "utilit", "nuclear", "renewable"] },
  { key: "financial", label: "Financial Services", synonyms: ["financ", "bank", "insurance", "investment", "capital market", "payment", "credit union", "stock exchange"] },
  { key: "healthcare", label: "Healthcare", synonyms: ["health", "hospital", "medical", "clinic", "biomed", "life scienc", "patient"] },
  { key: "technology", label: "Technology & IT", synonyms: ["technolog", "software", "it firm", "it compan", "it service", "cloud", "saas", "semiconductor", "electronics", "hardware", "managed service"] },
  { key: "telecom", label: "Telecommunications", synonyms: ["telecom", "telecommunication", "isp", "internet service", "mobile operator", "5g", "carrier"] },
  { key: "manufacturing", label: "Manufacturing & Industrial", synonyms: ["manufactur", "industrial", "engineering", "automotive", "machinery", "factory", "production"] },
  { key: "transportation", label: "Transportation & Logistics", synonyms: ["transport", "logistic", "shipping", "railway", "port", "supply chain", "freight"] },
  { key: "education", label: "Education & Research", synonyms: ["education", "universit", "academ", "research institut", "school", "think tank", "scholar"] },
  { key: "media", label: "Media & Journalism", synonyms: ["media", "journalis", "news", "broadcast", "press", "publisher", "entertainment"] },
  { key: "ngo", label: "NGO & Activism", synonyms: ["ngo", "non-governmental", "nonprofit", "non-profit", "human rights", "activist", "dissident", "civil society"] },
  { key: "critical_infra", label: "Critical Infrastructure", synonyms: ["critical infrastructure", "ics", "scada", "water treatment", "water utilit", "operational technology", "ot network"] },
  { key: "pharma", label: "Pharmaceuticals", synonyms: ["pharmaceutic", "pharma", "vaccine", "drug manufactur"] },
  { key: "retail", label: "Retail & E-commerce", synonyms: ["retail", "e-commerce", "ecommerce", "consumer goods", "hospitality chain", "point of sale", "pos "] },
  { key: "legal", label: "Legal & Professional", synonyms: ["legal", "law firm", "attorney", "consulting", "professional service", "accounting", "audit firm"] },
  { key: "hospitality", label: "Hospitality & Travel", synonyms: ["hospitality", "hotel", "tourism", "travel", "casino", "restaurant"] },
  { key: "maritime", label: "Maritime", synonyms: ["maritime", "naval", "shipbuild", "offshore", "seaport"] },
  { key: "crypto", label: "Cryptocurrency & Fintech", synonyms: ["cryptocurrenc", "crypto exchange", "blockchain", "defi", "fintech", "digital asset", "bitcoin"] },
]

export const SECTOR_LABEL: Record<string, string> = Object.fromEntries(SECTORS.map((s) => [s.key, s.label]))

export type RegionKey =
  | "north_america"
  | "latin_america"
  | "europe"
  | "middle_east"
  | "africa"
  | "central_asia"
  | "south_asia"
  | "east_asia"
  | "southeast_asia"
  | "oceania"

export const REGION_LABEL: Record<RegionKey, string> = {
  north_america: "North America",
  latin_america: "Latin America",
  europe: "Europe",
  middle_east: "Middle East",
  africa: "Africa",
  central_asia: "Central Asia",
  south_asia: "South Asia",
  east_asia: "East Asia",
  southeast_asia: "Southeast Asia",
  oceania: "Oceania",
}

export type Country = { code: string; name: string; region: RegionKey; aliases?: string[] }

// Full world gazetteer (~190 countries), each mapped to a region bucket for
// geography matching. Names via CLDR; key countries carry prose aliases.
export const COUNTRIES: Country[] = [
  { code: "US", name: "United States", region: "north_america", aliases: ["usa", "u.s.", "u.s.a", "america", "american", "united states"] },
  { code: "CA", name: "Canada", region: "north_america", aliases: ["canadian"] },
  { code: "GL", name: "Greenland", region: "north_america" },
  { code: "BM", name: "Bermuda", region: "north_america" },
  { code: "MX", name: "Mexico", region: "latin_america", aliases: ["mexican"] },
  { code: "GT", name: "Guatemala", region: "latin_america" },
  { code: "BZ", name: "Belize", region: "latin_america" },
  { code: "SV", name: "El Salvador", region: "latin_america" },
  { code: "HN", name: "Honduras", region: "latin_america" },
  { code: "NI", name: "Nicaragua", region: "latin_america" },
  { code: "CR", name: "Costa Rica", region: "latin_america" },
  { code: "PA", name: "Panama", region: "latin_america" },
  { code: "CU", name: "Cuba", region: "latin_america" },
  { code: "DO", name: "Dominican Republic", region: "latin_america" },
  { code: "HT", name: "Haiti", region: "latin_america" },
  { code: "JM", name: "Jamaica", region: "latin_america" },
  { code: "TT", name: "Trinidad & Tobago", region: "latin_america" },
  { code: "BS", name: "Bahamas", region: "latin_america" },
  { code: "BB", name: "Barbados", region: "latin_america" },
  { code: "PR", name: "Puerto Rico", region: "latin_america" },
  { code: "BR", name: "Brazil", region: "latin_america", aliases: ["brazilian"] },
  { code: "AR", name: "Argentina", region: "latin_america" },
  { code: "CL", name: "Chile", region: "latin_america" },
  { code: "CO", name: "Colombia", region: "latin_america" },
  { code: "PE", name: "Peru", region: "latin_america" },
  { code: "VE", name: "Venezuela", region: "latin_america" },
  { code: "EC", name: "Ecuador", region: "latin_america" },
  { code: "BO", name: "Bolivia", region: "latin_america" },
  { code: "PY", name: "Paraguay", region: "latin_america" },
  { code: "UY", name: "Uruguay", region: "latin_america" },
  { code: "GY", name: "Guyana", region: "latin_america" },
  { code: "SR", name: "Suriname", region: "latin_america" },
  { code: "GB", name: "United Kingdom", region: "europe", aliases: ["uk", "u.k.", "britain", "british", "england"] },
  { code: "IE", name: "Ireland", region: "europe" },
  { code: "FR", name: "France", region: "europe", aliases: ["french"] },
  { code: "DE", name: "Germany", region: "europe", aliases: ["german"] },
  { code: "IT", name: "Italy", region: "europe", aliases: ["italian"] },
  { code: "ES", name: "Spain", region: "europe", aliases: ["spanish"] },
  { code: "PT", name: "Portugal", region: "europe" },
  { code: "NL", name: "Netherlands", region: "europe", aliases: ["dutch", "holland"] },
  { code: "BE", name: "Belgium", region: "europe" },
  { code: "LU", name: "Luxembourg", region: "europe" },
  { code: "CH", name: "Switzerland", region: "europe" },
  { code: "AT", name: "Austria", region: "europe" },
  { code: "SE", name: "Sweden", region: "europe" },
  { code: "NO", name: "Norway", region: "europe" },
  { code: "FI", name: "Finland", region: "europe" },
  { code: "DK", name: "Denmark", region: "europe" },
  { code: "IS", name: "Iceland", region: "europe" },
  { code: "PL", name: "Poland", region: "europe", aliases: ["polish"] },
  { code: "CZ", name: "Czechia", region: "europe", aliases: ["czech"] },
  { code: "SK", name: "Slovakia", region: "europe" },
  { code: "HU", name: "Hungary", region: "europe" },
  { code: "RO", name: "Romania", region: "europe" },
  { code: "BG", name: "Bulgaria", region: "europe" },
  { code: "GR", name: "Greece", region: "europe", aliases: ["greek"] },
  { code: "HR", name: "Croatia", region: "europe" },
  { code: "SI", name: "Slovenia", region: "europe" },
  { code: "RS", name: "Serbia", region: "europe" },
  { code: "BA", name: "Bosnia & Herzegovina", region: "europe" },
  { code: "ME", name: "Montenegro", region: "europe" },
  { code: "MK", name: "North Macedonia", region: "europe" },
  { code: "AL", name: "Albania", region: "europe" },
  { code: "UA", name: "Ukraine", region: "europe", aliases: ["ukrainian"] },
  { code: "BY", name: "Belarus", region: "europe" },
  { code: "MD", name: "Moldova", region: "europe" },
  { code: "RU", name: "Russia", region: "europe", aliases: ["russian", "russian federation"] },
  { code: "EE", name: "Estonia", region: "europe" },
  { code: "LV", name: "Latvia", region: "europe" },
  { code: "LT", name: "Lithuania", region: "europe" },
  { code: "MT", name: "Malta", region: "europe" },
  { code: "CY", name: "Cyprus", region: "europe" },
  { code: "TR", name: "Türkiye", region: "middle_east", aliases: ["turkey", "türkiye", "turkiye", "turkish"] },
  { code: "IL", name: "Israel", region: "middle_east", aliases: ["israeli"] },
  { code: "PS", name: "Palestinian Territories", region: "middle_east" },
  { code: "SA", name: "Saudi Arabia", region: "middle_east", aliases: ["saudi"] },
  { code: "AE", name: "United Arab Emirates", region: "middle_east", aliases: ["uae", "emirates", "dubai"] },
  { code: "QA", name: "Qatar", region: "middle_east" },
  { code: "KW", name: "Kuwait", region: "middle_east" },
  { code: "BH", name: "Bahrain", region: "middle_east" },
  { code: "OM", name: "Oman", region: "middle_east" },
  { code: "YE", name: "Yemen", region: "middle_east" },
  { code: "IR", name: "Iran", region: "middle_east", aliases: ["iranian"] },
  { code: "IQ", name: "Iraq", region: "middle_east", aliases: ["iraqi"] },
  { code: "SY", name: "Syria", region: "middle_east", aliases: ["syrian"] },
  { code: "JO", name: "Jordan", region: "middle_east" },
  { code: "LB", name: "Lebanon", region: "middle_east" },
  { code: "EG", name: "Egypt", region: "africa", aliases: ["egyptian"] },
  { code: "LY", name: "Libya", region: "africa" },
  { code: "TN", name: "Tunisia", region: "africa" },
  { code: "DZ", name: "Algeria", region: "africa" },
  { code: "MA", name: "Morocco", region: "africa" },
  { code: "SD", name: "Sudan", region: "africa" },
  { code: "SS", name: "South Sudan", region: "africa" },
  { code: "ET", name: "Ethiopia", region: "africa" },
  { code: "ER", name: "Eritrea", region: "africa" },
  { code: "DJ", name: "Djibouti", region: "africa" },
  { code: "SO", name: "Somalia", region: "africa" },
  { code: "KE", name: "Kenya", region: "africa" },
  { code: "UG", name: "Uganda", region: "africa" },
  { code: "TZ", name: "Tanzania", region: "africa" },
  { code: "RW", name: "Rwanda", region: "africa" },
  { code: "BI", name: "Burundi", region: "africa" },
  { code: "NG", name: "Nigeria", region: "africa", aliases: ["nigerian"] },
  { code: "GH", name: "Ghana", region: "africa" },
  { code: "CI", name: "Côte d’Ivoire", region: "africa" },
  { code: "SN", name: "Senegal", region: "africa" },
  { code: "ML", name: "Mali", region: "africa" },
  { code: "BF", name: "Burkina Faso", region: "africa" },
  { code: "NE", name: "Niger", region: "africa" },
  { code: "TD", name: "Chad", region: "africa" },
  { code: "CM", name: "Cameroon", region: "africa" },
  { code: "CF", name: "Central African Republic", region: "africa" },
  { code: "GA", name: "Gabon", region: "africa" },
  { code: "CG", name: "Congo - Brazzaville", region: "africa" },
  { code: "CD", name: "Congo - Kinshasa", region: "africa" },
  { code: "AO", name: "Angola", region: "africa" },
  { code: "ZM", name: "Zambia", region: "africa" },
  { code: "ZW", name: "Zimbabwe", region: "africa" },
  { code: "MW", name: "Malawi", region: "africa" },
  { code: "MZ", name: "Mozambique", region: "africa" },
  { code: "MG", name: "Madagascar", region: "africa" },
  { code: "ZA", name: "South Africa", region: "africa", aliases: ["south african"] },
  { code: "NA", name: "Namibia", region: "africa" },
  { code: "BW", name: "Botswana", region: "africa" },
  { code: "LS", name: "Lesotho", region: "africa" },
  { code: "SZ", name: "Eswatini", region: "africa" },
  { code: "GN", name: "Guinea", region: "africa" },
  { code: "SL", name: "Sierra Leone", region: "africa" },
  { code: "LR", name: "Liberia", region: "africa" },
  { code: "TG", name: "Togo", region: "africa" },
  { code: "BJ", name: "Benin", region: "africa" },
  { code: "MR", name: "Mauritania", region: "africa" },
  { code: "GM", name: "Gambia", region: "africa" },
  { code: "GW", name: "Guinea-Bissau", region: "africa" },
  { code: "GQ", name: "Equatorial Guinea", region: "africa" },
  { code: "CV", name: "Cape Verde", region: "africa" },
  { code: "MU", name: "Mauritius", region: "africa" },
  { code: "SC", name: "Seychelles", region: "africa" },
  { code: "KZ", name: "Kazakhstan", region: "central_asia", aliases: ["kazakh"] },
  { code: "UZ", name: "Uzbekistan", region: "central_asia" },
  { code: "TM", name: "Turkmenistan", region: "central_asia" },
  { code: "TJ", name: "Tajikistan", region: "central_asia" },
  { code: "KG", name: "Kyrgyzstan", region: "central_asia" },
  { code: "AZ", name: "Azerbaijan", region: "central_asia", aliases: ["azerbaijani", "azeri"] },
  { code: "AM", name: "Armenia", region: "central_asia", aliases: ["armenian"] },
  { code: "GE", name: "Georgia", region: "central_asia", aliases: ["georgian"] },
  { code: "IN", name: "India", region: "south_asia", aliases: ["indian"] },
  { code: "PK", name: "Pakistan", region: "south_asia", aliases: ["pakistani"] },
  { code: "BD", name: "Bangladesh", region: "south_asia" },
  { code: "LK", name: "Sri Lanka", region: "south_asia" },
  { code: "NP", name: "Nepal", region: "south_asia" },
  { code: "BT", name: "Bhutan", region: "south_asia" },
  { code: "MV", name: "Maldives", region: "south_asia" },
  { code: "AF", name: "Afghanistan", region: "south_asia" },
  { code: "CN", name: "China", region: "east_asia", aliases: ["chinese", "prc"] },
  { code: "JP", name: "Japan", region: "east_asia", aliases: ["japanese"] },
  { code: "KR", name: "South Korea", region: "east_asia", aliases: ["korea", "korean", "republic of korea"] },
  { code: "KP", name: "North Korea", region: "east_asia", aliases: ["dprk", "north korean"] },
  { code: "TW", name: "Taiwan", region: "east_asia", aliases: ["taiwanese"] },
  { code: "HK", name: "Hong Kong SAR China", region: "east_asia" },
  { code: "MO", name: "Macao SAR China", region: "east_asia" },
  { code: "MN", name: "Mongolia", region: "east_asia" },
  { code: "VN", name: "Vietnam", region: "southeast_asia", aliases: ["vietnamese"] },
  { code: "TH", name: "Thailand", region: "southeast_asia", aliases: ["thai"] },
  { code: "PH", name: "Philippines", region: "southeast_asia", aliases: ["filipino"] },
  { code: "ID", name: "Indonesia", region: "southeast_asia", aliases: ["indonesian"] },
  { code: "MY", name: "Malaysia", region: "southeast_asia", aliases: ["malaysian"] },
  { code: "SG", name: "Singapore", region: "southeast_asia" },
  { code: "MM", name: "Myanmar (Burma)", region: "southeast_asia", aliases: ["burma"] },
  { code: "KH", name: "Cambodia", region: "southeast_asia" },
  { code: "LA", name: "Laos", region: "southeast_asia" },
  { code: "BN", name: "Brunei", region: "southeast_asia" },
  { code: "TL", name: "Timor-Leste", region: "southeast_asia" },
  { code: "AU", name: "Australia", region: "oceania", aliases: ["australian"] },
  { code: "NZ", name: "New Zealand", region: "oceania" },
  { code: "PG", name: "Papua New Guinea", region: "oceania" },
  { code: "FJ", name: "Fiji", region: "oceania" },
  { code: "SB", name: "Solomon Islands", region: "oceania" },
  { code: "VU", name: "Vanuatu", region: "oceania" },
  { code: "NC", name: "New Caledonia", region: "oceania" },
  { code: "PF", name: "French Polynesia", region: "oceania" },
  { code: "WS", name: "Samoa", region: "oceania" },
  { code: "TO", name: "Tonga", region: "oceania" },
  { code: "KI", name: "Kiribati", region: "oceania" },
  { code: "FM", name: "Micronesia", region: "oceania" },
  { code: "MH", name: "Marshall Islands", region: "oceania" },
  { code: "PW", name: "Palau", region: "oceania" },
  { code: "NR", name: "Nauru", region: "oceania" },
  { code: "TV", name: "Tuvalu", region: "oceania" },
]

export const COUNTRY_BY_CODE: Record<string, Country> = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]))

// Region phrases found in prose → region keys (e.g. "the Gulf" → Middle East).
export const REGION_PHRASES: { phrase: string; regions: RegionKey[] }[] = [
  { phrase: "middle east", regions: ["middle_east"] },
  { phrase: "gulf", regions: ["middle_east"] },
  { phrase: "gcc", regions: ["middle_east"] },
  { phrase: "levant", regions: ["middle_east"] },
  { phrase: "north america", regions: ["north_america"] },
  { phrase: "latin america", regions: ["latin_america"] },
  { phrase: "south america", regions: ["latin_america"] },
  { phrase: "central america", regions: ["latin_america"] },
  { phrase: "western europe", regions: ["europe"] },
  { phrase: "eastern europe", regions: ["europe"] },
  { phrase: "europe", regions: ["europe"] },
  { phrase: "european union", regions: ["europe"] },
  { phrase: "balkan", regions: ["europe"] },
  { phrase: "nordic", regions: ["europe"] },
  { phrase: "scandinavia", regions: ["europe"] },
  { phrase: "the west", regions: ["north_america", "europe"] },
  { phrase: "western countries", regions: ["north_america", "europe"] },
  { phrase: "nato", regions: ["north_america", "europe"] },
  { phrase: "africa", regions: ["africa"] },
  { phrase: "sub-saharan", regions: ["africa"] },
  { phrase: "central asia", regions: ["central_asia"] },
  { phrase: "south asia", regions: ["south_asia"] },
  { phrase: "indian subcontinent", regions: ["south_asia"] },
  { phrase: "east asia", regions: ["east_asia"] },
  { phrase: "southeast asia", regions: ["southeast_asia"] },
  { phrase: "south-east asia", regions: ["southeast_asia"] },
  { phrase: "south east asia", regions: ["southeast_asia"] },
  { phrase: "asia-pacific", regions: ["east_asia", "southeast_asia", "oceania"] },
  { phrase: "asia pacific", regions: ["east_asia", "southeast_asia", "oceania"] },
  { phrase: "apac", regions: ["east_asia", "southeast_asia", "oceania"] },
  { phrase: "oceania", regions: ["oceania"] },
]
