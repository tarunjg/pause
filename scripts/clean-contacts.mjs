#!/usr/bin/env node
/**
 * Contact Import Cleaner
 *
 * Parses two CSVs (calendar contacts + people I've met),
 * extracts name/email/org, filters junk, dedupes, validates MX records,
 * and outputs a clean CSV ready for import.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import dns from 'dns/promises';

// ── Config ──────────────────────────────────────────────────────────
const CALENDAR_CSV = resolve(process.env.HOME, 'Downloads/all_calendar_contacts.xlsx - All Calendar Contacts.csv');
const PEOPLE_CSV = resolve(process.env.HOME, 'Downloads/People I\'ve met - Contacts.csv');
const OUTPUT_CSV = resolve(import.meta.dirname, '../contacts-cleaned.csv');
const OUTPUT_JSON = resolve(import.meta.dirname, '../contacts-cleaned.json');

const EXCLUDED_DOMAINS = ['lattice.com'];
const JUNK_PATTERNS = [
  /^[0-9a-f]{8}-[0-9a-f]{4}-/i,   // UUID-style local parts
  /^noreply@/i,
  /^no-reply@/i,
  /^donotreply@/i,
  /^mailer-daemon@/i,
  /^notifications@/i,
  /^calendar-notification@/i,
  /^feedback@/i,
  /^support@/i,
];

// ── CSV Parsing ─────────────────────────────────────────────────────

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(text) {
  const lines = text.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => { row[h.trim()] = (values[i] || '').trim(); });
    return row;
  });
}

// ── Name / Email Extraction ─────────────────────────────────────────

function titleCase(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(/[\s]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function splitName(fullName) {
  if (!fullName) return { firstName: '', lastName: '' };
  const cleaned = fullName.replace(/["']/g, '').trim();
  // Handle "Last, First" format
  if (cleaned.includes(',')) {
    const [last, first] = cleaned.split(',').map(s => s.trim());
    return { firstName: titleCase(first), lastName: titleCase(last) };
  }
  const parts = cleaned.split(/\s+/);
  return {
    firstName: titleCase(parts[0]),
    lastName: titleCase(parts.slice(1).join(' ')),
  };
}

function inferNameFromEmail(email) {
  const local = email.split('@')[0];
  // Try common patterns: first.last, firstlast, first_last
  const dotParts = local.split('.');
  if (dotParts.length >= 2 && dotParts[0].length > 1) {
    return {
      firstName: titleCase(dotParts[0].replace(/[^a-zA-Z]/g, '')),
      lastName: titleCase(dotParts.slice(1).join(' ').replace(/[^a-zA-Z\s]/g, '')),
    };
  }
  const underParts = local.split('_');
  if (underParts.length >= 2 && underParts[0].length > 1) {
    return {
      firstName: titleCase(underParts[0].replace(/[^a-zA-Z]/g, '')),
      lastName: titleCase(underParts.slice(1).join(' ').replace(/[^a-zA-Z\s]/g, '')),
    };
  }
  // Single word — use as first name if it looks like a name
  const cleaned = local.replace(/[^a-zA-Z]/g, '');
  if (cleaned.length >= 2 && cleaned.length <= 20) {
    return { firstName: titleCase(cleaned), lastName: '' };
  }
  return { firstName: '', lastName: '' };
}

// Extract email from messy strings like: "Name" <email@domain.com>
function extractEmailFromString(str) {
  if (!str) return null;
  const angleMatch = str.match(/<([^>]+@[^>]+)>/);
  if (angleMatch) return angleMatch[1].trim().toLowerCase();
  const plainMatch = str.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
  if (plainMatch) return plainMatch[0].trim().toLowerCase();
  return null;
}

// Extract name from "Name" <email> format
function extractNameFromEmailString(str) {
  if (!str) return null;
  // Match quoted name before angle bracket
  const quotedMatch = str.match(/^"?([^"<]+)"?\s*</);
  if (quotedMatch) {
    const name = quotedMatch[1].trim().replace(/^["']+|["']+$/g, '');
    if (name && !name.includes('@')) return name;
  }
  return null;
}

// ── Validation ──────────────────────────────────────────────────────

function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function isExcludedDomain(email) {
  const domain = email.split('@')[1];
  return EXCLUDED_DOMAINS.some(d => domain === d || domain.endsWith('.' + d));
}

function isJunkEmail(email) {
  return JUNK_PATTERNS.some(p => p.test(email));
}

async function checkMX(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

// ── Main Pipeline ───────────────────────────────────────────────────

async function main() {
  console.log('📂 Reading CSVs...\n');

  // Parse calendar contacts
  const calendarRaw = readFileSync(CALENDAR_CSV, 'utf-8');
  const calendarRows = parseCSV(calendarRaw);
  console.log(`  Calendar contacts: ${calendarRows.length} rows`);

  // Parse people I've met
  const peopleRaw = readFileSync(PEOPLE_CSV, 'utf-8');
  const peopleRows = parseCSV(peopleRaw);
  console.log(`  People I've met:   ${peopleRows.length} rows`);

  // ── Step 1: Extract from calendar contacts ──
  const calendarContacts = [];
  for (const row of calendarRows) {
    const email = (row.Email || '').trim().toLowerCase();
    if (!email || !isValidEmailFormat(email)) continue;

    const { firstName, lastName } = row.Name
      ? splitName(row.Name)
      : inferNameFromEmail(email);

    const org = row.Organization || '';

    calendarContacts.push({
      email,
      firstName,
      lastName,
      org: org === 'gmail.com' || org === 'yahoo.com' || org === 'hotmail.com' || org === 'outlook.com'
        ? '' : titleCase(org.replace('.com', '').replace('.org', '').replace('.edu', '').replace('.io', '')),
      source: 'calendar',
    });
  }
  console.log(`\n  Calendar: ${calendarContacts.length} valid emails extracted`);

  // ── Step 2: Extract from people I've met ──
  const peopleContacts = [];
  for (const row of peopleRows) {
    const emailField = row.Email || '';
    const email = extractEmailFromString(emailField);
    if (!email || !isValidEmailFormat(email)) continue;

    const embeddedName = extractNameFromEmailString(emailField);
    const { firstName, lastName } = embeddedName
      ? splitName(embeddedName)
      : inferNameFromEmail(email);

    const affiliation = row.Affiliation || row['Personal / Professional / Both'] || '';

    peopleContacts.push({
      email,
      firstName,
      lastName,
      org: titleCase(affiliation.trim()),
      source: 'people-met',
    });
  }
  console.log(`  People met: ${peopleContacts.length} valid emails extracted`);

  // ── Step 3: Filter junk & excluded domains ──
  const allContacts = [...calendarContacts, ...peopleContacts];
  const filtered = [];
  let latticeCount = 0;
  let junkCount = 0;

  for (const c of allContacts) {
    if (isExcludedDomain(c.email)) { latticeCount++; continue; }
    if (isJunkEmail(c.email)) { junkCount++; continue; }
    filtered.push(c);
  }

  console.log(`\n🧹 Filtering:`);
  console.log(`  Removed ${latticeCount} Lattice emails`);
  console.log(`  Removed ${junkCount} junk/system emails`);
  console.log(`  Remaining: ${filtered.length}`);

  // ── Step 4: Dedupe by email (keep richer record) ──
  const byEmail = new Map();
  for (const c of filtered) {
    const existing = byEmail.get(c.email);
    if (!existing) {
      byEmail.set(c.email, c);
    } else {
      // Merge: prefer record with more data
      if (!existing.firstName && c.firstName) existing.firstName = c.firstName;
      if (!existing.lastName && c.lastName) existing.lastName = c.lastName;
      if (!existing.org && c.org) existing.org = c.org;
      if (c.source !== existing.source) existing.source = 'both';
    }
  }

  const deduped = [...byEmail.values()];
  console.log(`\n🔗 Deduplication:`);
  console.log(`  Before: ${filtered.length}`);
  console.log(`  After:  ${deduped.length}`);
  console.log(`  Dupes removed: ${filtered.length - deduped.length}`);

  // ── Step 5: MX validation ──
  console.log(`\n📡 Validating email domains (MX check)...`);
  const domainCache = new Map();
  let validCount = 0;
  let invalidCount = 0;
  const invalidEmails = [];
  const validContacts = [];

  // Batch unique domains first
  const uniqueDomains = new Set(deduped.map(c => c.email.split('@')[1]));
  console.log(`  Checking ${uniqueDomains.size} unique domains...`);

  let checked = 0;
  for (const domain of uniqueDomains) {
    const valid = await checkMX(domain);
    domainCache.set(domain, valid);
    checked++;
    if (checked % 50 === 0) {
      process.stdout.write(`  ...${checked}/${uniqueDomains.size}\n`);
    }
  }

  for (const c of deduped) {
    const domain = c.email.split('@')[1];
    if (domainCache.get(domain)) {
      validContacts.push(c);
      validCount++;
    } else {
      invalidEmails.push(c.email);
      invalidCount++;
    }
  }

  console.log(`\n  ✅ Valid: ${validCount}`);
  console.log(`  ❌ Invalid (no MX): ${invalidCount}`);
  if (invalidEmails.length > 0 && invalidEmails.length <= 20) {
    console.log(`  Invalid emails: ${invalidEmails.join(', ')}`);
  } else if (invalidEmails.length > 20) {
    console.log(`  First 20 invalid: ${invalidEmails.slice(0, 20).join(', ')}`);
  }

  // ── Step 6: Output ──
  // Sort by org, then last name, then first name
  validContacts.sort((a, b) => {
    const orgCmp = (a.org || '').localeCompare(b.org || '');
    if (orgCmp !== 0) return orgCmp;
    const lastCmp = (a.lastName || '').localeCompare(b.lastName || '');
    if (lastCmp !== 0) return lastCmp;
    return (a.firstName || '').localeCompare(b.firstName || '');
  });

  // Write CSV
  const csvHeader = 'First Name,Last Name,Email,Organization,Source';
  const csvRows = validContacts.map(c =>
    `"${c.firstName}","${c.lastName}","${c.email}","${c.org}","${c.source}"`
  );
  writeFileSync(OUTPUT_CSV, [csvHeader, ...csvRows].join('\n'), 'utf-8');

  // Write JSON (for import endpoint)
  writeFileSync(OUTPUT_JSON, JSON.stringify(validContacts, null, 2), 'utf-8');

  console.log(`\n📄 Output written:`);
  console.log(`  CSV: ${OUTPUT_CSV}`);
  console.log(`  JSON: ${OUTPUT_JSON}`);
  console.log(`\n✅ Done! ${validContacts.length} contacts ready for review.`);

  // Quick stats
  const orgs = {};
  for (const c of validContacts) {
    const org = c.org || '(no org)';
    orgs[org] = (orgs[org] || 0) + 1;
  }
  const topOrgs = Object.entries(orgs).sort((a, b) => b[1] - a[1]).slice(0, 15);
  console.log(`\n📊 Top organizations:`);
  for (const [org, count] of topOrgs) {
    console.log(`  ${org}: ${count}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
