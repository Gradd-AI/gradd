// app/debug/markdown-test/page.tsx
// Verifies that MessageRenderer correctly renders GFM markdown tables.
// Auth-gated — same check as dashboard. Remove this page after verification.

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import MessageRenderer from '@/components/chat/MessageRenderer';

export const dynamic = 'force-dynamic';

const TEST_CONTENT = `
Here is a comparison table rendered through the chat message renderer:

| Feature | Sole Trader | Partnership | Private Ltd | Public Plc |
| --- | --- | --- | --- | --- |
| Liability | Unlimited | Unlimited | Limited | Limited |
| Capital access | Personal savings | Partner contributions | Share issuance (private) | Stock exchange |
| Control | Owner unilateral | Shared between partners | Director-controlled, shareholder approval | Board governance |
| Accounts visibility | Private | Private | Filed at Companies House | Filed publicly |

Text after the table should render normally. **Bold** and *italic* should still work.

- Bullet list item one
- Bullet list item two

1. Numbered item one
2. Numbered item two
`.trim();

export default async function MarkdownTestPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--chat-bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 24px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 800,
        background: 'var(--chat-surface)',
        borderRadius: 12,
        border: '1px solid var(--chat-border)',
        padding: '32px',
      }}>
        <p style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--chat-muted)',
          marginBottom: 24,
          borderBottom: '1px solid var(--chat-border)',
          paddingBottom: 12,
        }}>
          Debug — MessageRenderer table test
        </p>
        <MessageRenderer content={TEST_CONTENT} />
      </div>
    </div>
  );
}
