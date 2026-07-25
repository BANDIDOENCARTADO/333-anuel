// Netlify Function: creates a Stripe Checkout Session from the cart sent by the browser.
// Requires the environment variable STRIPE_SECRET_KEY to be set in Netlify
// (Site settings -> Environment variables). Never put the secret key in the HTML/JS.

const Stripe = require('stripe');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
    const { cart } = JSON.parse(event.body || '{}');

    if (!Array.isArray(cart) || cart.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Carrito vacío' }) };
    }

    // Build Stripe line items dynamically from whatever is in the cart.
    // Prices are defined here (in cents) as a safety net, NOT trusted from the browser,
    // so a customer can't tamper with prices via devtools.
    const PRICES = {
      bc: 33, sp: 33, cl: 33, sf: 33, ph: 33,
      pl: 33, po: 33, mf: 33, fw: 33, fl: 33, cb: 33
    };

    const line_items = cart.map(function (item) {
      const unitPrice = PRICES[item.id];
      if (!unitPrice) throw new Error('Producto desconocido: ' + item.id);
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: item.name + ' — ' + item.colorName,
          },
          unit_amount: Math.round(unitPrice * 100),
        },
        quantity: item.qty,
      };
    });

    const origin = event.headers.origin || ('https://' + event.headers.host);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: line_items,
      success_url: origin + '/?checkout=success',
      cancel_url: origin + '/?checkout=cancel',
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
