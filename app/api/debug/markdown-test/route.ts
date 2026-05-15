import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const TABLE_MARKDOWN = `
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

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  return NextResponse.json({ content: TABLE_MARKDOWN });
}
