import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const PRICES = {
  deck1:  process.env.STRIPE_PRICE_DECK1,
  deck5:  process.env.STRIPE_PRICE_DECK5,
  deck50: process.env.STRIPE_PRICE_DECK50,
};

const DECKS = { deck1: 1, deck5: 5, deck50: 50 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { packageId, userId } = req.body;

  if (!PRICES[packageId]) return res.status(400).json({ error: 'Invalid package' });
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: PRICES[packageId], quantity: 1 }],
      mode: 'payment',
      success_url: `${process.env.APP_URL}?purchase=success`,
      cancel_url:  `${process.env.APP_URL}?purchase=cancelled`,
      metadata: {
        userId,
        packageId,
        decks: String(DECKS[packageId]),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    res.status(500).json({ error: err.message });
  }
}
