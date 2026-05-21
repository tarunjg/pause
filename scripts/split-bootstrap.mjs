#!/usr/bin/env node
/**
 * Split the bootstrap SQL into chunks that won't trigger Supabase's
 * "mirror does not exist" multi-statement error.
 *
 * Outputs to ~/Desktop/pause-chunk-{1,2,3,4}.sql
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const SRC = join(homedir(), 'Desktop', 'pause-bootstrap.sql');
const sql = readFileSync(SRC, 'utf-8');

// Split by section markers (the comment headers in the generated SQL)
const sections = sql.split(/^-- ─── /m).filter(Boolean);

// Sort into chunks
const chunks = {
  '1-tables': [],          // all CREATE TABLE and CREATE INDEX statements
  '2-contacts-a': [],      // first half of contact inserts
  '2-contacts-b': [],      // second half of contact inserts
  '3-seeds': [],           // post_ideas + style_guide inserts
};

const contactBatches = [];
let inSeeds = false;

for (const section of sections) {
  const header = section.split('\n')[0].trim();

  if (header.startsWith('contacts ') || header.startsWith('newsletter_sends ') ||
      header.startsWith('pause_posts ') || header.startsWith('pause_images ') ||
      header.startsWith('pause_post_ideas ') || header.startsWith('pause_style_guide ')) {
    // Take only up through the CREATE INDEX statements (no inserts here)
    const body = '-- ─── ' + section;
    // The post_ideas section also has an INSERT INTO; split that off
    if (header.startsWith('pause_post_ideas ')) {
      // CREATE TABLE block ends at first 'insert into pause_post_ideas'
      const splitAt = body.indexOf('insert into pause_post_ideas');
      if (splitAt > 0) {
        chunks['1-tables'].push(body.slice(0, splitAt).trim());
        chunks['3-seeds'].push(body.slice(splitAt).trim());
      } else {
        chunks['1-tables'].push(body.trim());
      }
    } else if (header.startsWith('pause_style_guide ')) {
      const splitAt = body.indexOf('insert into pause_style_guide');
      if (splitAt > 0) {
        chunks['1-tables'].push(body.slice(0, splitAt).trim());
        chunks['3-seeds'].push(body.slice(splitAt).trim());
      } else {
        chunks['1-tables'].push(body.trim());
      }
    } else {
      chunks['1-tables'].push(body.trim());
    }
  } else if (header.startsWith('seed: 1,717 contacts')) {
    // The whole section is INSERT statements separated by blank lines
    const inserts = ('-- ─── ' + section).split(/\n\s*\n/).filter(s => s.trim());
    contactBatches.push(...inserts.filter(s => s.startsWith('insert into contacts')));
  } else if (header.startsWith('seed: 20 book-to-newsletter ideas')) {
    chunks['3-seeds'].push('-- ─── ' + section);
  } else if (header.startsWith('seed: v1 style guide')) {
    chunks['3-seeds'].push('-- ─── ' + section);
  } else if (header.startsWith('Done')) {
    // skip
  } else if (header.startsWith('storage bucket')) {
    // skip — create via UI
  }
}

// Split contact batches in half
const mid = Math.ceil(contactBatches.length / 2);
chunks['2-contacts-a'] = contactBatches.slice(0, mid);
chunks['2-contacts-b'] = contactBatches.slice(mid);

const HEADER_NOTE = `-- ════════════════════════════════════════════════════════════════
--  PASTE THIS CHUNK INTO SUPABASE SQL EDITOR
--  (Results tab selected, then Run)
-- ════════════════════════════════════════════════════════════════
`;

for (const [name, parts] of Object.entries(chunks)) {
  const out = HEADER_NOTE + '\n' + parts.join('\n\n') + '\n';
  const path = join(homedir(), 'Desktop', `pause-chunk-${name}.sql`);
  writeFileSync(path, out);
  console.log(`  ${path}  (${(out.length / 1024).toFixed(1)} KB, ${out.split('\n').length} lines)`);
}

console.log(`\n  Contacts split into ${contactBatches.length} batches: ${mid} in chunk 2a, ${contactBatches.length - mid} in chunk 2b`);
