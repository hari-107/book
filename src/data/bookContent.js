/**
 * bookContent.js — the single editable content file for the entire book.
 *
 * Everything the book displays (page text, images, captions, navigation
 * targets, section metadata) lives here. Swap content without touching
 * any component code.
 *
 * Model:  section → pages → content blocks → images → navigation target
 *
 * Block types:
 *   { type: 'paragraph', text }         — typewriter body text
 *   { type: 'lead', text }              — big handwritten opening line
 *   { type: 'list', items: [..] }       — arrow-bulleted scribble list
 *   { type: 'rows', rows: [[k, v]..] }  — label/value rows (contact, dates)
 *   { type: 'quote', text }             — big handwritten pull quote
 *   { type: 'subheading', text }        — stamped subheading
 *   { type: 'note', text }              — a taped-on paper note
 *
 * Section `theme` drives that section's hand-drawn personality:
 *   explorer | inventor | journal | blueprint | stamps | treasure |
 *   scholar | chaos | letter
 *
 * Images:
 *   { id, src, caption, detail }
 *   - src: URL or path. `null` renders a labelled polaroid placeholder.
 *   - caption: short summary shown when the photo is focused.
 *   - detail: optional page id — focused caption appends "See page N…".
 *
 * CONTENT INTEGRITY: every value marked [PLACEHOLDER] is intentional stub
 * content — no real portfolio information has been invented. The owner name
 * and title-page wording come from the user's own mockup.
 */

export const PLACEHOLDER_PREFIX = '[PLACEHOLDER'

export const bookMeta = {
  title: 'PORTFOLIO',
  owner: 'HARI PRASATH',
  monogram: '✦',
  spineTitle: 'PORTFOLIO',
  tagline: 'Turn the pages, explore the story',
}

// Structural pages (Welcome, Title, Index, The End)
export const structural = {
  welcome: {
    id: 'welcome',
    heading: 'Psst… over here',
    theme: 'welcome',
    blocks: [
      { type: 'lead', text: 'You found the book. Excellent.' },
      { type: 'list', items: [
        'Double-click near a page’s outer edge → it turns. Right edge goes onward, left edge goes back.',
        'Double-click anywhere else on the book → pick it up and spin it. Double-click again to set it down.',
        'Double-click the little ✦ seal at the foot of any page → the book’s own map opens.',
        'Click a photograph → it jumps up to meet you. Esc sends it back.',
        'Arrow keys turn pages. R resets the view. That’s all the machinery.',
      ] },
      { type: 'note', text: 'nothing in here bites. probably.' },
    ],
    images: [],
  },
  title: {
    id: 'title',
    heading: '', // drawn as custom art — HARI PRASATH / PORTFOLIO
    theme: 'title',
    blocks: [],
    images: [],
  },
  index: {
    id: 'index',
    heading: 'INDEX',
    theme: 'index',
    // Entries are generated from the sections below plus The End.
  },
  end: {
    id: 'the-end',
    heading: 'THE END',
    theme: 'end',
    blocks: [
      { type: 'quote', text: '…or is it?' },
      { type: 'paragraph', text: 'Thanks for exploring. Close the tab, or start again — the book will wait. It is very patient.' },
    ],
    images: [],
  },
}

// The content sections, in Index order.
export const sections = [
  {
    id: 'about',
    title: 'About Me',
    theme: 'explorer',
    pages: [
      {
        id: 'about-1',
        heading: 'About Me',
        blocks: [
          { type: 'lead', text: '[PLACEHOLDER — two or three sentences: who you are, what you build, what you chase.]' },
          { type: 'paragraph', text: '[PLACEHOLDER — background: where you are based, what you are studying or building right now, and how the adventure started.]' },
          { type: 'note', text: '[PLACEHOLDER — one weird fact about you]' },
        ],
        images: [
          { id: 'about-portrait', src: null, caption: '[PLACEHOLDER — a photo of the explorer]', detail: null },
        ],
      },
      {
        id: 'about-2',
        heading: 'Field Notes on the Author',
        blocks: [
          { type: 'paragraph', text: '[PLACEHOLDER — interests, obsessions, values — the things that make your work yours.]' },
          { type: 'quote', text: '[PLACEHOLDER — a motto you actually live by.]' },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'skills',
    title: 'Skills',
    theme: 'inventor',
    pages: [
      {
        id: 'skills-1',
        heading: 'The Toolbox',
        blocks: [
          { type: 'subheading', text: 'Languages & Frameworks' },
          { type: 'list', items: [
            '[PLACEHOLDER — a language you use daily]',
            '[PLACEHOLDER — a framework or runtime]',
            '[PLACEHOLDER — another core tool]',
          ] },
          { type: 'subheading', text: 'Machines & Contraptions' },
          { type: 'list', items: [
            '[PLACEHOLDER — version control / CI / cloud]',
            '[PLACEHOLDER — design, data or infra tools]',
          ] },
        ],
        images: [],
      },
      {
        id: 'skills-2',
        heading: 'How the Inventor Works',
        blocks: [
          { type: 'paragraph', text: '[PLACEHOLDER — how you solve problems, collaborate, and what teammates rely on you for.]' },
          { type: 'list', items: [
            '[PLACEHOLDER — a working strength]',
            '[PLACEHOLDER — another working strength]',
          ] },
          { type: 'note', text: '[PLACEHOLDER — current experiment in progress]' },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'experience',
    title: 'Experience',
    theme: 'journal',
    pages: [
      {
        id: 'exp-1',
        heading: 'Expedition Log',
        blocks: [
          { type: 'rows', rows: [
            ['[PLACEHOLDER — dates]', '[PLACEHOLDER — role, organisation, one-line war story]'],
            ['[PLACEHOLDER — dates]', '[PLACEHOLDER — role, organisation, one-line war story]'],
          ] },
        ],
        images: [],
      },
      {
        id: 'exp-2',
        heading: 'Log, Continued',
        blocks: [
          { type: 'rows', rows: [
            ['[PLACEHOLDER — dates]', '[PLACEHOLDER — internship / freelance / open-source stint]'],
          ] },
          { type: 'paragraph', text: '[PLACEHOLDER — what these journeys taught you.]' },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    theme: 'blueprint',
    pages: [
      {
        id: 'projects-1',
        heading: 'Evidence Recovered',
        blocks: [
          { type: 'note', text: 'Specimens gathered in the field. All details taken from the repositories themselves — nothing embellished.' },
          { type: 'subheading', text: 'No. 01 · LLM Prompt-Injection Firewall' },
          { type: 'paragraph', text: 'A production-oriented security gateway that inspects every prompt before it reaches an LLM and every response before it reaches the user — detecting, blocking, sanitizing, logging and explaining prompt-injection and jailbreak attempts and sensitive-data leaks.' },
          { type: 'list', items: [
            'Pure-Python detection core: normalize → rules → classifier → risk scoring → sanitize/output-scan.',
            'Django layer: RBAC (admin/analyst/auditor), JWT + API-key auth, DRF endpoints, Swagger.',
            'Tamper-evident audit log via a per-row SHA-256 hash chain; dark Chart.js dashboard; PDF forensic reports.',
            'Layered decoding (base64/hex/url/rot13/unicode) + invisible-char stripping; MITRE-ATLAS-style rule tags.',
          ] },
          { type: 'rows', rows: [
            ['Stack', 'Python · Django · DRF · Postgres · Redis · Docker'],
            ['Repo', 'github.com/hari-107/llm-prompt-injection-firewall (private)'],
          ] },
        ],
        images: [
          { id: 'proj-firewall', src: null, caption: 'Firewall dashboard — blocked injection attempt', detail: 'projects-1' },
        ],
      },
      {
        id: 'projects-2',
        heading: 'Evidence, Cont’d',
        blocks: [
          { type: 'subheading', text: 'No. 02 · WebSec Scanner' },
          { type: 'paragraph', text: 'A Django platform that runs an automated, multi-stage security assessment against a target site — recon, SSL/TLS, tech detection, port scan, directory enumeration, crawling, then non-destructive SQLi / XSS / misconfig / auth tests — correlated into a CVSS-scored report with PDF export. Consent-gated; authorised use only.' },
          { type: 'list', items: [
            'Fault-tolerant sequential pipeline — one module failing never aborts the run.',
            'Auto-detects nmap / ffuf / whatweb / nikto, with pure-Python fallbacks so it runs tool-free.',
            'Live progress streaming, side-by-side scan comparison, findings with evidence, CWE and remediation.',
          ] },
          { type: 'rows', rows: [
            ['Stack', 'Python · Django · MySQL · Bootstrap · Chart.js · ReportLab'],
            ['Repo', 'github.com/hari-107/web-scanning (private)'],
          ] },
          { type: 'subheading', text: 'No. 03 · Crypto Lab' },
          { type: 'paragraph', text: '“My first project” — a clean vanilla-JS encryption/decryption tool with five algorithms (Caesar, XOR, Base64, Vigenère, SHA-256), a CyberChef-style Magic auto-detector using frequency analysis, and a dark/light theme.' },
          { type: 'rows', rows: [
            ['Stack', 'HTML5 · CSS3 · Vanilla JS · Web Crypto API'],
            ['Repo', 'github.com/hari-107/crypto-lab (public)'],
          ] },
        ],
        images: [
          { id: 'proj-webscan', src: null, caption: 'WebSec Scanner — findings report', detail: 'projects-2' },
          { id: 'proj-cryptolab', src: null, caption: 'Crypto Lab — the first build', detail: 'projects-2' },
        ],
      },
      {
        id: 'projects-3',
        heading: 'Evidence, Final Case',
        blocks: [
          { type: 'subheading', text: 'No. 04 · Advanced Crypto Lab' },
          { type: 'paragraph', text: 'A Flask single-page successor to Crypto Lab: 30+ algorithms (classical ciphers, modern encodings, AES/DES/3DES/ChaCha20/RSA, hashing/HMAC/bcrypt/PBKDF2) plus a registry-driven Magic engine that scores candidates on printable ratio, word/letter frequency, entropy and UTF-8 validity, then recursively decodes and explains.' },
          { type: 'rows', rows: [
            ['Stack', 'Python · Flask · Bootstrap · vanilla JS'],
            ['Repo', 'github.com/hari-107/crypto-lab-adv (private)'],
          ] },
          { type: 'subheading', text: 'No. 05 · Smart Agriculture Assistant' },
          { type: 'paragraph', text: 'A Flask (Blueprints + SQLAlchemy) agricultural management system with an AI chatbot for crop-cultivation guidance built on a Tamil Nadu crop dataset — crop guides and schedules, role-based auth, a REST API with Swagger docs, and a responsive UI.' },
          { type: 'rows', rows: [
            ['Stack', 'Python · Flask · SQLAlchemy · MySQL · Swagger'],
            ['Repo', 'github.com/hari-107/Smart-Agriculture-Assistant (private)'],
          ] },
          { type: 'note', text: 'Four of the five repos are private — ping me for a walkthrough or access.' },
        ],
        images: [
          { id: 'proj-cryptoadv', src: null, caption: 'Advanced Crypto Lab — Magic analysis', detail: 'projects-3' },
          { id: 'proj-agri', src: null, caption: 'Agri Assistant — chatbot + crop guides', detail: 'projects-3' },
        ],
      },
    ],
  },
  {
    id: 'certifications',
    title: 'Certifications',
    theme: 'stamps',
    pages: [
      {
        id: 'certs-1',
        heading: 'Papers & Seals',
        blocks: [
          { type: 'rows', rows: [
            ['[PLACEHOLDER — year]', '[PLACEHOLDER — certification name and issuer]'],
            ['[PLACEHOLDER — year]', '[PLACEHOLDER — certification name and issuer]'],
          ] },
        ],
        images: [],
      },
      {
        id: 'certs-2',
        heading: 'More Official-Looking Things',
        blocks: [
          { type: 'rows', rows: [
            ['[PLACEHOLDER — year]', '[PLACEHOLDER — certification name and issuer]'],
          ] },
          { type: 'paragraph', text: '[PLACEHOLDER — context, or delete this page in bookContent.js.]' },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'achievements',
    title: 'Achievements',
    theme: 'treasure',
    pages: [
      {
        id: 'achv-1',
        heading: 'The Treasure Haul',
        blocks: [
          { type: 'rows', rows: [
            ['[PLACEHOLDER — year]', '[PLACEHOLDER — award / win / rank and where]'],
            ['[PLACEHOLDER — year]', '[PLACEHOLDER — award / win / rank and where]'],
          ] },
        ],
        images: [],
      },
      {
        id: 'achv-2',
        heading: 'X Marks the Spot',
        blocks: [
          { type: 'paragraph', text: '[PLACEHOLDER — the achievement you are proudest of, and the story behind it.]' },
          { type: 'note', text: '[PLACEHOLDER — a tiny brag you pretend is casual]' },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'writeups',
    title: 'Field Reports',
    theme: 'reports',
    pages: [
      {
        id: 'writeups-1',
        heading: 'CTF Field Reports',
        blocks: [
          { type: 'note', text: 'Recovered from the DEF CON CTF 2026 expedition. Two challenges, fully written up.' },
          { type: 'subheading', text: 'Absolute Cinema · OSINT · Medium' },
          { type: 'paragraph', text: 'Traced the challenge to a terminal-recording platform, located the author’s uploaded session, inspected the recording frame by frame, and decoded a Base64 flag hidden in the static system information.' },
          { type: 'subheading', text: 'Revelations · Cryptography · Easy' },
          { type: 'paragraph', text: 'Identified the challenge image as the Celestial Alphabet, decoded the symbols, and wrapped the recovered phrase in the flag format.' },
          { type: 'rows', rows: [
            ['Repo', 'github.com/hari-107/defcon-writeups (public)'],
          ] },
        ],
        images: [
          { id: 'wu-defcon', src: null, caption: 'DEF CON CTF 2026 — writeup pages', detail: 'writeups-1' },
        ],
      },
      {
        id: 'writeups-2',
        heading: 'The Case Notes',
        blocks: [
          { type: 'paragraph', text: 'Each report keeps its own full walkthrough and supporting screenshots, with relative image links so the notes read straight from the repository.' },
          { type: 'note', text: '[PLACEHOLDER — add new writeups here as you solve them.]' },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'education',
    title: 'Education',
    theme: 'scholar',
    pages: [
      {
        id: 'edu-1',
        heading: 'The Academy Years',
        blocks: [
          { type: 'rows', rows: [
            ['[PLACEHOLDER — dates]', '[PLACEHOLDER — degree / institution / highlight]'],
            ['[PLACEHOLDER — dates]', '[PLACEHOLDER — school / course / highlight]'],
          ] },
        ],
        images: [],
      },
      {
        id: 'edu-2',
        heading: 'Self-Taught Scrolls',
        blocks: [
          { type: 'paragraph', text: '[PLACEHOLDER — courses, books, and rabbit holes that actually taught you things.]' },
          { type: 'list', items: [
            '[PLACEHOLDER — a course or book]',
            '[PLACEHOLDER — another one]',
          ] },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'funzone',
    title: 'Fun Zone',
    theme: 'chaos',
    pages: [
      {
        id: 'fun-1',
        heading: 'FUN ZONE',
        blocks: [
          { type: 'lead', text: 'Abandon professionalism, all ye who enter here.' },
          { type: 'list', items: [
            'This page serves no business purpose. It is proud of that.',
            'There is a button on this page. It says DO NOT PRESS. You know what to do.',
            'Somewhere in this book a skull is judging you.',
          ] },
          { type: 'note', text: '404: professionalism not found' },
        ],
        images: [],
      },
      {
        id: 'fun-2',
        heading: 'Doodle Reserve',
        blocks: [
          { type: 'paragraph', text: 'Official habitat of stray robots, unexplained arrows and at least one maze with no exit. Protected by international scribble law.' },
          { type: 'quote', text: 'sudo make cool' },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact Me',
    theme: 'letter',
    pages: [
      {
        id: 'contact-1',
        heading: 'Send Word',
        blocks: [
          { type: 'lead', text: '[PLACEHOLDER — a short closing line inviting the reader to write to you.]' },
          { type: 'rows', rows: [
            ['Email', '[PLACEHOLDER — email address]'],
            ['GitHub', '[PLACEHOLDER — profile URL]'],
            ['LinkedIn', '[PLACEHOLDER — profile URL]'],
            ['Location', '[PLACEHOLDER — city, country]'],
          ] },
        ],
        images: [],
      },
      {
        id: 'contact-2',
        heading: 'The Letter',
        blocks: [
          { type: 'paragraph', text: '[PLACEHOLDER — a short handwritten-style letter to whoever reached the last pages: what you are looking for, what you can offer, why they should reply.]' },
          { type: 'note', text: 'P.S. — Let’s build cool things together.' },
        ],
        images: [],
      },
    ],
  },
]
