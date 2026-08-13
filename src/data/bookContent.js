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
 *   { type: 'paragraph', text }         — body paragraph
 *   { type: 'lead', text }              — slightly larger opening paragraph
 *   { type: 'list', items: [..] }       — bulleted list
 *   { type: 'rows', rows: [[k, v]..] }  — label/value rows (contact, dates)
 *   { type: 'quote', text }             — pull quote
 *   { type: 'subheading', text }        — small-caps subheading
 *
 * Images:
 *   { id, src, caption, detail }
 *   - src: URL or path. `null` renders a graceful generated placeholder.
 *   - caption: short summary shown when the image is focused.
 *   - detail: optional page id — the focused caption will append
 *     "See page N for full details" pointing at that page.
 *
 * CONTENT INTEGRITY: every value marked [PLACEHOLDER] below is intentional.
 * No real portfolio information has been invented. Replace each marker with
 * your real content.
 */

export const PLACEHOLDER_PREFIX = '[PLACEHOLDER'

export const bookMeta = {
  title: 'Portfolio',
  owner: '[PLACEHOLDER — Your Name]',
  monogram: 'P', // single letter stamped on the cover emblem and page feet
  spineTitle: 'PORTFOLIO',
}

// Structural pages (never listed in the Index)
export const structural = {
  welcome: {
    id: 'welcome',
    heading: 'Welcome',
    blocks: [
      { type: 'lead', text: 'This portfolio is bound as a book. Every control you need is part of the object itself.' },
      { type: 'list', items: [
        'Double-click near a page’s outer edge to turn it.',
        'Double-click anywhere else on the book to pick it up and rotate it freely; double-click again to set it down.',
        'Double-click the emblem stamped at the foot of any page to open the book’s own navigation.',
        'Click a floating image to focus it. Press Esc to release it.',
        'Arrow keys turn pages. R resets the view.',
      ] },
      { type: 'paragraph', text: 'Turn the page to begin.' },
    ],
    images: [],
  },
  index: {
    id: 'index',
    heading: 'Index',
    // Entries are generated from the six sections below — exactly six,
    // each pointing at the section's first page. Do not add entries here.
  },
  end: {
    id: 'end',
    heading: '',
    blocks: [
      { type: 'quote', text: '· fin ·' },
      { type: 'paragraph', text: 'Thank you for reading.' },
    ],
    images: [],
  },
}

// The six content sections, in Index order.
export const sections = [
  {
    id: 'about',
    title: 'About Me',
    pages: [
      {
        id: 'about-1',
        heading: 'About Me',
        blocks: [
          { type: 'lead', text: '[PLACEHOLDER — a two or three sentence introduction: who you are, what you do, what you care about.]' },
          { type: 'paragraph', text: '[PLACEHOLDER — background: where you are based, what you are currently studying or building, and what drew you to your field.]' },
        ],
        images: [
          { id: 'about-portrait', src: null, caption: '[PLACEHOLDER — portrait photo]', detail: null },
        ],
      },
      {
        id: 'about-2',
        heading: 'Beyond the Work',
        blocks: [
          { type: 'paragraph', text: '[PLACEHOLDER — interests, values, or a short story that gives your portfolio a human voice.]' },
          { type: 'quote', text: '[PLACEHOLDER — a personal motto or line you work by.]' },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'skills',
    title: 'Skills',
    pages: [
      {
        id: 'skills-1',
        heading: 'Skills',
        blocks: [
          { type: 'subheading', text: 'Languages & Frameworks' },
          { type: 'list', items: [
            '[PLACEHOLDER — e.g. a language you use daily]',
            '[PLACEHOLDER — a framework or runtime]',
            '[PLACEHOLDER — another core tool]',
          ] },
          { type: 'subheading', text: 'Tools & Platforms' },
          { type: 'list', items: [
            '[PLACEHOLDER — e.g. version control, CI, cloud]',
            '[PLACEHOLDER — design / data / infra tools]',
          ] },
        ],
        images: [],
      },
      {
        id: 'skills-2',
        heading: 'How I Work',
        blocks: [
          { type: 'paragraph', text: '[PLACEHOLDER — strengths in practice: collaboration style, problem-solving approach, what teammates rely on you for.]' },
          { type: 'list', items: [
            '[PLACEHOLDER — a working strength]',
            '[PLACEHOLDER — another working strength]',
          ] },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'projects',
    title: 'Projects',
    pages: [
      {
        id: 'projects-1',
        heading: 'Projects',
        blocks: [
          { type: 'subheading', text: '[PLACEHOLDER — Project One name]' },
          { type: 'paragraph', text: '[PLACEHOLDER — one paragraph: what it is, what you built, what it achieved.]' },
          { type: 'subheading', text: '[PLACEHOLDER — Project Two name]' },
          { type: 'paragraph', text: '[PLACEHOLDER — one paragraph description.]' },
        ],
        images: [
          { id: 'proj-img-1', src: null, caption: '[PLACEHOLDER — Project One screenshot]', detail: 'projects-1' },
          { id: 'proj-img-2', src: null, caption: '[PLACEHOLDER — Project Two screenshot]', detail: 'projects-1' },
          { id: 'proj-img-3', src: null, caption: '[PLACEHOLDER — detail view]', detail: 'projects-2' },
        ],
      },
      {
        id: 'projects-2',
        heading: 'Selected Work, Continued',
        blocks: [
          { type: 'subheading', text: '[PLACEHOLDER — Project Three name]' },
          { type: 'paragraph', text: '[PLACEHOLDER — one paragraph description.]' },
          { type: 'paragraph', text: '[PLACEHOLDER — links to live demos or repositories can be listed on the Contact page.]' },
        ],
        images: [
          { id: 'proj-img-4', src: null, caption: '[PLACEHOLDER — Project Three screenshot]', detail: 'projects-2' },
        ],
      },
    ],
  },
  {
    id: 'certifications',
    title: 'Certifications & Achievements',
    pages: [
      {
        id: 'certs-1',
        heading: 'Certifications & Achievements',
        blocks: [
          { type: 'rows', rows: [
            ['[PLACEHOLDER — year]', '[PLACEHOLDER — certification name and issuer]'],
            ['[PLACEHOLDER — year]', '[PLACEHOLDER — certification name and issuer]'],
            ['[PLACEHOLDER — year]', '[PLACEHOLDER — award or achievement]'],
          ] },
        ],
        images: [],
      },
      {
        id: 'certs-2',
        heading: 'Recognition',
        blocks: [
          { type: 'paragraph', text: '[PLACEHOLDER — context for the achievements you are proudest of, or remove this page by deleting it from bookContent.js.]' },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'experience',
    title: 'Experience / Learning Journey',
    pages: [
      {
        id: 'exp-1',
        heading: 'Experience',
        blocks: [
          { type: 'rows', rows: [
            ['[PLACEHOLDER — dates]', '[PLACEHOLDER — role, organisation, one-line summary]'],
            ['[PLACEHOLDER — dates]', '[PLACEHOLDER — role, organisation, one-line summary]'],
          ] },
        ],
        images: [],
      },
      {
        id: 'exp-2',
        heading: 'Learning Journey',
        blocks: [
          { type: 'paragraph', text: '[PLACEHOLDER — education, self-study, and what you are learning right now.]' },
          { type: 'rows', rows: [
            ['[PLACEHOLDER — dates]', '[PLACEHOLDER — degree / course / milestone]'],
          ] },
        ],
        images: [],
      },
    ],
  },
  {
    id: 'contact',
    title: 'Contact',
    pages: [
      {
        id: 'contact-1',
        heading: 'Contact',
        blocks: [
          { type: 'lead', text: '[PLACEHOLDER — a short closing line inviting the reader to get in touch.]' },
          { type: 'rows', rows: [
            ['Email', '[PLACEHOLDER — email address]'],
            ['GitHub', '[PLACEHOLDER — profile URL]'],
            ['LinkedIn', '[PLACEHOLDER — profile URL]'],
            ['Location', '[PLACEHOLDER — city, country]'],
          ] },
        ],
        images: [],
      },
    ],
  },
]
