import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Required: disable Vercel's default body parser so we get the raw body
// needed for Stripe signature verification
export const config = { api: { bodyParser: false } };

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // ── 1. Verify the webhook signature ──────────────────────────────────────
  const rawBody = await getRawBody(req);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // ── 2. Only handle completed checkout sessions ────────────────────────────
  if (event.type !== 'checkout.session.completed') {
    return res.json({ received: true });
  }

  const session = event.data.object;
  const { userId, decks } = session.metadata;

  if (!userId || !decks) {
    console.error('Missing metadata on session:', session.id);
    return res.status(400).json({ error: 'Missing metadata' });
  }

  // ── 3. Additively credit decks via Supabase RPC ───────────────────────────
  // Uses add_bonus_decks(p_player_id, p_decks) which does:
  //   UPDATE player_stats SET bonus_decks = bonus_decks + p_decks WHERE player_id = p_player_id
  // This ensures stacked purchases (e.g. buy 5, then buy 5 more) work correctly.
  try {
    const response = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/rpc/add_bonus_decks`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          p_player_id: userId,
          p_decks: parseInt(decks, 10),
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('Supabase RPC failed:', errText);
      // Return 500 so Stripe retries the webhook
      return res.status(500).json({ error: 'Failed to credit decks' });
    }

    console.log(`Credited ${decks} deck(s) to user ${userId}`);
  } catch (err) {
    console.error('Unexpected error crediting decks:', err);
    return res.status(500).json({ error: err.message });
  }

  res.json({ received: true });
}
