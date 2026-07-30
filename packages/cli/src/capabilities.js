export const capabilitySchemaVersion = 1

export const capabilityGroups = [
  {
    id: 'document',
    title: 'Document lifecycle',
    capabilities: [
      {
        id: 'document-tree',
        name: 'Document tree',
        status: 'available',
        detail: 'Create, rename, duplicate, move, sort, favorite, search, trash, and restore documents.',
      },
      {
        id: 'rich-text',
        name: 'Rich-text editing',
        status: 'available',
        detail: 'Tiptap editing with tables, tasks, columns, images, code, Mermaid, links, and templates.',
      },
      {
        id: 'versions',
        name: 'Version history',
        status: 'available',
        detail: 'Structured snapshots, block-aware diffs, and protected version restore.',
      },
      {
        id: 'sharing',
        name: 'Document sharing',
        status: 'experimental',
        detail:
          'Read/write share relations and notifications exist, but owner checks on relation mutations still need hardening.',
      },
      {
        id: 'publishing',
        name: 'Publishing',
        status: 'experimental',
        detail:
          'Public links, moderation state, public reading, republish/unpublish, and PDF export exist, but publication creation needs an owner check.',
      },
    ],
  },
  {
    id: 'collaboration',
    title: 'Realtime collaboration',
    capabilities: [
      {
        id: 'realtime-editing',
        name: 'Realtime editing',
        status: 'available',
        detail: 'Yjs and Hocuspocus rooms with presence, offline state, and PostgreSQL persistence.',
      },
      {
        id: 'collaboration-auth',
        name: 'End-to-end collaboration authorization',
        status: 'experimental',
        detail:
          'The WebSocket layer checks short-lived tokens and document access, but upstream share mutations need owner hardening.',
      },
      {
        id: 'integration-tests',
        name: 'Collaboration recovery path',
        status: 'experimental',
        detail:
          'Active-room restore exists, but the service currently has syntax checks rather than automated multi-client recovery tests.',
      },
    ],
  },
  {
    id: 'ai',
    title: 'AI assistance',
    capabilities: [
      {
        id: 'ai-writing',
        name: 'AI writing tools',
        status: 'available',
        detail: 'Outline, summarize, continue, translate, explain, shorten, lengthen, and change tone.',
      },
      {
        id: 'ai-chat',
        name: 'Document-side AI chat',
        status: 'available',
        detail: 'Streaming chat, Markdown and Mermaid rendering, reusable output, and usage limits.',
      },
    ],
  },
  {
    id: 'platform',
    title: 'Platform and governance',
    capabilities: [
      {
        id: 'authentication',
        name: 'Authentication',
        status: 'available',
        detail: 'GitHub OAuth plus development SMTP and production Resend email sign-in.',
      },
      {
        id: 'document-authorization',
        name: 'Document, share, and publishing authorization',
        status: 'experimental',
        detail:
          'Ownership and read/write relations exist, but single-document reads, share mutations, and publication creation need hardening.',
      },
      {
        id: 'admin',
        name: 'Administration',
        status: 'available',
        detail: 'Admin overview, document governance, publication status, and user administration.',
      },
      {
        id: 'product-surface',
        name: 'Product surface',
        status: 'available',
        detail: 'Chinese and English interfaces with dark/light themes and responsive landing pages.',
      },
      {
        id: 'storage',
        name: 'Object storage',
        status: 'experimental',
        detail: 'Image upload is supported through the current OSS adapter; a provider-neutral interface is pending.',
      },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    capabilities: [
      {
        id: 'compose',
        name: 'Container stack',
        status: 'available',
        detail: 'PostgreSQL, Prisma schema application, collaboration, and Web services run through Docker Compose.',
      },
      {
        id: 'cli',
        name: 'doc CLI',
        status: 'available',
        detail:
          'Initialize configuration, diagnose dependencies, manage the stack, inspect logs, and run database tasks.',
      },
      {
        id: 'health',
        name: 'Health checks',
        status: 'available',
        detail: 'Configuration diagnostics plus optional live checks for Web, database, and collaboration surfaces.',
      },
    ],
  },
]

export function capabilitySummary() {
  return capabilityGroups.reduce(
    (summary, group) => {
      for (const capability of group.capabilities) {
        summary[capability.status] = (summary[capability.status] || 0) + 1
      }
      return summary
    },
    { available: 0, experimental: 0 }
  )
}
