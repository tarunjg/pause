#!/usr/bin/env node
/**
 * Generate a comprehensive bootstrap SQL file for the new Pause Lab Supabase project.
 *
 * Reads contacts-cleaned.json from the main repo (1,717 contacts) and emits one
 * SQL file that, when pasted into the Supabase SQL Editor, will:
 *
 *   1. Create the `contacts` and `newsletter_sends` tables (matching the existing schema)
 *   2. Create the 4 new `pause_*` tables for the admin portal
 *   3. Insert all 1,717 contacts (with proper escaping)
 *   4. Seed 20 book-to-newsletter ideas
 *   5. Seed v1 of the AI style guide
 *   6. Create the `pause-newsletter-images` storage bucket
 *
 * Output goes to ~/Desktop/pause-bootstrap.sql so it stays off the public repo.
 *
 * Usage: node scripts/generate-bootstrap-sql.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';
import { homedir } from 'os';

const CONTACTS_JSON = '/Users/tarun.galagali/Developer/pause/contacts-cleaned.json';
const OUTPUT_PATH = join(homedir(), 'Desktop', 'pause-bootstrap.sql');

function sqlEscape(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return String(value);
  // String: escape single quotes by doubling them, wrap in single quotes
  return `'${String(value).replace(/'/g, "''")}'`;
}

const POST_IDEAS = [
  ['The five minutes before Slack', 'Breathe', "Prologue (Bia's morning)", "A reflection on what happens when you check your phone before you've arrived in your own day. Start with a personal story of a morning where you caught yourself reaching for the phone. Weave in the neuroscience of morning cortisol and how the first stimulus shapes the nervous system's trajectory for the day. Land on a small practice: what if you waited five minutes?"],
  ['Why your team mirrors your stress', 'Engage', 'Ch 2 (mirror neurons)', "A story about noticing your own tension showing up in someone else during a meeting. Use this as an entry point into mirror neuron research: how leaders' emotional states are literally contagious. Reference Rizzolatti's original discovery and the implications for anyone who manages people. The practical takeaway: your calm is a gift to your team."],
  ['The question that changed my 1:1s', 'Engage', 'Ch 3 (WAIT practice)', "Introducing the \"Why Am I Talking?\" pause. Start with a real 1:1 where you caught yourself filling silence. What happened when you stopped? The neuroscience of why silence feels uncomfortable (the brain's default mode network) and why that discomfort is actually productive. A simple experiment: try WAIT in your next conversation."],
  ['What I learned from three weeks off', 'Breathe', "Ch 4 (Tarun's Bali trip)", "The personal story of the book idea coming together during rest in Bali. What happens to the brain when you truly disconnect: the research on incubation periods and creative insight. The signal/noise audit concept. Not everyone can take three weeks off, but the principle scales down: even a weekend without email changes something."],
  ['Being gentle with fear', 'Metta', 'Ch 5 (Metta)', "A reflection on fear as protector, not enemy. A personal experience with sitting with discomfort instead of reacting. The neuroscience of the amygdala's role and how metta (loving-kindness) practice literally changes its reactivity over time. This is not about being fearless. It's about being with fear."],
  ['AI is making the treadmill faster', 'General', 'Ch 1 (Berkeley study)', "The research on AI intensifying work instead of reducing it. What \"work snacks\" are doing to our recovery time. Start with a personal observation about how tools that were supposed to save time created new expectations instead. The Berkeley study data. Land on: pausing isn't anti-technology, it's how you keep technology from running you."],
  ['Your nervous system keeps the score', 'Breathe', 'Ch 2 (nervous system)', "An accessible introduction to how the autonomic nervous system tracks cumulative stress, even when your conscious mind says \"I'm fine.\" A personal moment of realizing you were more depleted than you thought. The polyvagal theory basics, made simple. Why recovery isn't laziness, it's maintenance."],
  ['The meeting before the meeting', 'Adapt', 'Ch 3 (preparation)', "A reflection on what happens in the 60 seconds before you walk into an important conversation. Most people prepare content. Almost nobody prepares their state. A personal story of a meeting that went differently because you took 30 seconds to arrive first. The neuroscience of state-dependent performance."],
  ['What my co-author taught me about listening', 'Engage', 'Ch 2 (Michael Platt)', "A personal story about working with Michael Platt and watching a neuroscientist practice what he preaches about attention and presence. What you learned about listening from someone who studies the brain for a living. The research on attention as a limited resource and what that means for leadership."],
  ['The cost of "just one more email"', 'General', 'Ch 1 (attention residue)', "The research on attention residue: why switching to email for \"just a second\" fragments your thinking for the next 20 minutes. A personal story of noticing this pattern. Sophie Leroy's research. The practical insight: batching isn't about productivity hacks, it's about respecting how your brain actually works."],
  ['Slow decisions, fast results', 'Adapt', 'Ch 4 (decision quality)', "A counterintuitive finding: leaders who pause before deciding make decisions that stick. The research on decision fatigue and the quality gap between reactive and reflective choices. A real example of a decision you almost rushed and what happened when you waited a day. Pausing isn't indecision. It's precision."],
  ['How rest became my competitive advantage', 'Breathe', 'Ch 4 (rest and performance)', "A personal reflection on how embracing rest changed your work output, not in spite of resting but because of it. The research on default mode network activation during rest and its role in creative problem-solving. Stories from athletes and performers who train rest as seriously as effort."],
  ['The leader who changed by doing nothing', 'Adapt', 'Ch 3 (case study)', "A composite story (anonymized) of a leader from the Mandala training who discovered that their biggest impact came from what they stopped doing, not what they started. How removing one reactive pattern changed their team's culture. The neuroscience of habit loops and the surprisingly small effort it takes to interrupt one."],
  ['What your body knows before your brain does', 'Breathe', 'Ch 2 (interoception)', "An introduction to interoception: the body's internal sensing system and why leaders who are connected to their physical signals make better decisions. A personal story of a time your body flagged something before your mind caught up. The research linking interoceptive awareness to emotional regulation and empathy."],
  ['The group chat is not community', 'Engage', 'Ch 5 (connection)', "A reflection on the difference between digital connection and felt connection. The neuroscience of co-regulation and why being physically present with someone activates brain circuits that screens cannot. Not anti-technology, but a call to notice what's missing when we substitute convenience for presence."],
  ['Writing a book taught me to pause', 'General', 'Book process', "A meta-reflection on how the process of writing about pausing forced you to actually practice it. The moments during writing where you had to slow down, sit with uncertainty, or abandon a chapter that wasn't honest enough. What it taught you about the gap between knowing and doing."],
  ['The Metta practice I was skeptical about', 'Metta', 'Ch 5 (Metta practice)', "An honest account of initial skepticism about loving-kindness meditation and what happened when you tried it consistently. The neuroscience: how metta practice measurably increases compassion circuits and decreases amygdala reactivity. It's not soft. It's structural brain change."],
  ['Why "bring your whole self to work" misses the point', 'Adapt', 'Ch 3 (authenticity)', "A nuanced take on the popular workplace advice. The real issue isn't authenticity, it's regulation. You can be fully yourself and still choose how you show up. The neuroscience of emotional regulation vs. suppression. A personal reflection on finding the balance."],
  ['Three breaths that change everything', 'Breathe', 'Ch 2 (breathing research)', "The simplest practice in the book: three intentional breaths before any transition. The vagal nerve research showing why this works (it's not placebo). Personal stories of using this in meetings, before difficult conversations, and at the start of the day. Sometimes the smallest intervention has the largest effect."],
  ['What leaders owe their future selves', 'General', 'Epilogue', "A forward-looking reflection on leadership as a long game. The choices you make today about pace, presence, and recovery compound over years. The research on burnout trajectories and what separates leaders who sustain from those who crash. An invitation to think about the leader you want to be in ten years and work backward from there."],
];

const STYLE_GUIDE_V1 = `PAUSE LAB NEWSLETTER STYLE GUIDE

VOICE
- First person, Tarun speaking
- Warm, honest, conversational
- Not academic, not corporate
- Comfortable with vulnerability
- References real people and situations (anonymized when needed)
- Cites research by name (study, author, institution) but explains it plainly

STRUCTURE
- Short paragraphs (2-4 sentences max)
- Open with a personal story or observation
- Weave in neuroscience research naturally
- Land on a practical takeaway or reflection
- Total length: 400-800 words (sweet spot for engagement)

RECURRING THEMES
- Nervous system regulation and why it matters for decision-making
- The cost of not pausing (what we lose when we run on fumes)
- Leadership as emotional weather (your state affects your team)
- The BEAM framework: Breathe, Engage, Adapt, Metta
- Mirror neurons and co-regulation
- Technology, attention, and recovery
- The case for slowing down in a speed-obsessed culture

TONE MARKERS
- Uses I freely
- Shares real moments
- Occasionally one-line paragraphs for emphasis
- No jargon without translation
- Accessible language for complex research
- Short sentences mixed with longer ones
- Blockquotes for research findings

FORMATTING RULES
- No em dashes
- No corporate buzzwords
- No listicles or numbered tips
- Images should complement the story

SIGN-OFF ENERGY
- Warm, brief
- Glad you are here feeling
- No aggressive CTAs

IMMUTABLE CORE (do not modify through automated updates):
- Voice: warm, honest, personal, grounded in research
- First person, Tarun speaking
- Vulnerability is strength
- No em dashes, no corporate speak`;

function generateSql() {
  const contacts = JSON.parse(readFileSync(CONTACTS_JSON, 'utf-8'));

  const lines = [];

  lines.push('-- ====================================================================');
  lines.push('-- Pause Lab Admin Portal — Bootstrap SQL for fresh Supabase project');
  lines.push('-- ====================================================================');
  lines.push('-- Generated automatically. Safe to re-run (idempotent).');
  lines.push(`-- Contacts: ${contacts.length}  Ideas: ${POST_IDEAS.length}`);
  lines.push('-- ====================================================================');
  lines.push('');

  // contacts
  lines.push('-- ─── contacts ───────────────────────────────────────────────────────');
  lines.push(`create table if not exists contacts (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  first_name text,
  last_name text,
  org text,
  interests text[] default '{}',
  notes text,
  subscribed boolean default true,
  source text default 'website',
  unsubscribe_token uuid default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);`);
  lines.push('create index if not exists idx_contacts_email on contacts(email);');
  lines.push('create index if not exists idx_contacts_subscribed on contacts(subscribed);');
  lines.push('create unique index if not exists idx_contacts_unsubscribe_token on contacts(unsubscribe_token);');
  lines.push('');

  // updated_at trigger
  lines.push(`create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;`);
  lines.push('');
  lines.push(`do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'contacts_updated_at') then
    create trigger contacts_updated_at
      before update on contacts
      for each row
      execute function update_updated_at();
  end if;
end $$;`);
  lines.push('');

  // newsletter_sends
  lines.push('-- ─── newsletter_sends ───────────────────────────────────────────────');
  lines.push(`create table if not exists newsletter_sends (
  id uuid default gen_random_uuid() primary key,
  subject text not null,
  recipients int default 0,
  failed int default 0,
  sent_at timestamptz default now()
);`);
  lines.push('');

  // pause_posts
  lines.push('-- ─── pause_posts ────────────────────────────────────────────────────');
  lines.push(`create table if not exists pause_posts (
  id uuid default gen_random_uuid() primary key,
  slug text unique,
  title text not null default '',
  body_html text not null default '',
  body_text text not null default '',
  cover_image_url text,
  status text not null default 'draft',
  sent_at timestamptz,
  recipients_count int not null default 0,
  bounced_count int not null default 0,
  open_rate float,
  click_rate float,
  avg_read_time_seconds int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);`);
  lines.push('create index if not exists idx_pause_posts_status on pause_posts(status);');
  lines.push('create index if not exists idx_pause_posts_sent_at on pause_posts(sent_at desc);');
  lines.push('');

  // pause_images
  lines.push('-- ─── pause_images ───────────────────────────────────────────────────');
  lines.push(`create table if not exists pause_images (
  id uuid default gen_random_uuid() primary key,
  url text not null,
  filename text not null,
  size_bytes int,
  post_id uuid references pause_posts(id) on delete set null,
  created_at timestamptz not null default now()
);`);
  lines.push('create index if not exists idx_pause_images_post_id on pause_images(post_id);');
  lines.push('');

  // pause_post_ideas
  lines.push('-- ─── pause_post_ideas ───────────────────────────────────────────────');
  lines.push(`create table if not exists pause_post_ideas (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  theme text not null,
  source_chapter text,
  prompt text not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);`);
  lines.push('create index if not exists idx_pause_post_ideas_theme on pause_post_ideas(theme);');
  lines.push('create index if not exists idx_pause_post_ideas_used on pause_post_ideas(used);');
  lines.push('');

  // pause_style_guide
  lines.push('-- ─── pause_style_guide ──────────────────────────────────────────────');
  lines.push(`create table if not exists pause_style_guide (
  id uuid default gen_random_uuid() primary key,
  version int not null default 1,
  content text not null,
  insights text,
  status text not null default 'approved',
  created_at timestamptz not null default now()
);`);
  lines.push('create index if not exists idx_pause_style_guide_version on pause_style_guide(version desc);');
  lines.push('');

  // Seed contacts (batched inserts of 100 per statement)
  lines.push('-- ─── seed: 1,717 contacts ───────────────────────────────────────────');
  const BATCH_SIZE = 100;
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    const values = batch.map(c => {
      const email = sqlEscape(c.email.toLowerCase().trim());
      const firstName = sqlEscape(c.firstName || '');
      const lastName = sqlEscape(c.lastName || '');
      const org = c.org ? sqlEscape(c.org) : 'NULL';
      const source = sqlEscape(c.source || 'imported');
      return `  (${email}, ${firstName}, ${lastName}, ${org}, ${source}, true)`;
    }).join(',\n');
    lines.push(`insert into contacts (email, first_name, last_name, org, source, subscribed) values\n${values}\non conflict (email) do nothing;`);
    lines.push('');
  }

  // Seed post ideas
  lines.push('-- ─── seed: 20 book-to-newsletter ideas ──────────────────────────────');
  lines.push(`insert into pause_post_ideas (title, theme, source_chapter, prompt)
select * from (values`);
  const ideaRows = POST_IDEAS.map(([title, theme, chapter, prompt]) =>
    `  (${sqlEscape(title)}, ${sqlEscape(theme)}, ${sqlEscape(chapter)}, ${sqlEscape(prompt)})`
  ).join(',\n');
  lines.push(ideaRows);
  lines.push(`) as new_ideas(title, theme, source_chapter, prompt)
where not exists (select 1 from pause_post_ideas limit 1);`);
  lines.push('');

  // Seed style guide
  lines.push('-- ─── seed: v1 style guide ───────────────────────────────────────────');
  lines.push(`insert into pause_style_guide (version, content, status)
select 1, ${sqlEscape(STYLE_GUIDE_V1)}, 'approved'
where not exists (select 1 from pause_style_guide limit 1);`);
  lines.push('');

  // Storage bucket
  lines.push('-- ─── storage bucket ─────────────────────────────────────────────────');
  lines.push(`insert into storage.buckets (id, name, public)
values ('pause-newsletter-images', 'pause-newsletter-images', true)
on conflict (id) do nothing;`);
  lines.push('');

  lines.push('-- ─── Done ───────────────────────────────────────────────────────────');
  lines.push('-- Verify:');
  lines.push("--   select count(*) from contacts;  -- expect 1717");
  lines.push("--   select count(*) from pause_post_ideas;  -- expect 20");
  lines.push("--   select count(*) from pause_style_guide;  -- expect 1");

  return lines.join('\n');
}

const sql = generateSql();
writeFileSync(OUTPUT_PATH, sql);
console.log(`✓ Bootstrap SQL written to: ${OUTPUT_PATH}`);
console.log(`  Size: ${(sql.length / 1024).toFixed(1)} KB`);
console.log(`  Lines: ${sql.split('\n').length}`);
