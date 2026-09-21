// Keyword rules that turn free-text Role / Location into the buckets the public
// dashboard shows. Runs at sync time so the browser never sees raw strings.

const ROLE_RULES = [
  ['GRC & Compliance', /\b(grc|compliance|governance|risk|audit|privacy|tprm|third[- ]party|nerc|controls?)\b/i],
  ['SOC & Incident Response', /\b(soc|security operations|incident|detection|threat|hunting|response|falcon|advisor)\b/i],
  ['Cloud & Security Eng', /\b(cloud|engineer|vulnerability|patch|security software|remediation|infrastructure)\b/i],
  ['IAM', /\b(iam|identity|access)\b/i],
]

export function roleFamily(role = '') {
  if (!role || /not recorded/i.test(role)) return 'Unspecified'
  for (const [label, re] of ROLE_RULES) if (re.test(role)) return label
  if (/\b(analyst|security)\b/i.test(role)) return 'Security Analyst (general)'
  return 'Other'
}

const REGION_RULES = [
  ['Remote', /\bremote\b/i],
  ['New York / NJ', /\b(new york|nyc|,\s*ny\b|\bnj\b|clifton|oyster bay|manhattan\b(?!\s*beach))/i],
  ['Texas', /\b(tx|texas|dallas|houston|austin|plano|irving|wylie|woodlands|san antonio|bastrop)\b/i],
  ['California', /\b(ca|california|los angeles|hawthorne|santa ana|san diego|san jose|santa clara|irvine|manhattan beach|san mateo)\b/i],
]

export function region(location = '') {
  if (!location) return 'Unspecified'
  for (const [label, re] of REGION_RULES) if (re.test(location)) return label
  return 'Other'
}
