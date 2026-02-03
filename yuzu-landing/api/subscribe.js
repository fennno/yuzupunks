// /api/subscribe.js
// Vercel serverless function that proxies requests to Laylo's GraphQL API
// Your LAYLO_API_KEY is stored as an environment variable in Vercel dashboard

export default async function handler(req, res) {
  // only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, phone } = req.body;

  // basic validation
  if (!email && !phone) {
    return res.status(400).json({ error: 'Email or phone required' });
  }

  // email format check (loose)
  if (email && !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  // phone format check (loose - just make sure it has digits)
  if (phone && !/\d{10,}/.test(phone.replace(/\D/g, ''))) {
    return res.status(400).json({ error: 'Invalid phone format' });
  }

  const LAYLO_API_KEY = process.env.LAYLO_API_KEY;

  if (!LAYLO_API_KEY) {
    console.error('LAYLO_API_KEY not set');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const mutation = `
    mutation($email: String, $phoneNumber: String) {
      subscribeToUser(email: $email, phoneNumber: $phoneNumber)
    }
  `;

  try {
    const response = await fetch('https://laylo.com/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LAYLO_API_KEY}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables: {
          email: email || null,
          phoneNumber: phone || null,
        },
      }),
    });

    const data = await response.json();

    if (data.errors) {
      console.error('Laylo API error:', data.errors);
      return res.status(400).json({ error: 'Subscription failed', details: data.errors });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Request failed:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
