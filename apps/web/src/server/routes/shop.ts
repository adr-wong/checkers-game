import { Hono } from 'hono'
import type { Env } from 'hono'
import Stripe from 'stripe'
import { verifyToken } from '@clerk/backend'
import { recordPurchase, getPurchasedStyles, userOwnsStyle } from '../../models/purchase.service'
import { PREMIUM_STYLES } from '../../styles/index'
import { isStripeEnabled } from '../../lib/stripe'

const stripe = isStripeEnabled
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
  : null

type ShopEnv = Env & {
  Variables: {
    userId: string
  }
}

const shopRouter = new Hono<ShopEnv>()

async function requireAuth(c: any, next: any) {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  try {
    const payload = await verifyToken(authHeader.slice(7), {
      secretKey: process.env.CLERK_SECRET_KEY,
    })
    c.set('userId', payload.sub)
    await next()
  } catch {
    return c.json({ error: 'Invalid token' }, 401)
  }
}

shopRouter.get('/owned', async (c) => {
  if (!isStripeEnabled) {
    const allIds = Object.keys(PREMIUM_STYLES)
    return c.json({ owned: ['classic', ...allIds] })
  }

  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ owned: ['classic'] })
  }

  try {
    const payload = await verifyToken(authHeader.slice(7), {
      secretKey: process.env.CLERK_SECRET_KEY,
    })
    const owned = await getPurchasedStyles(payload.sub)
    return c.json({ owned: ['classic', ...owned] })
  } catch {
    return c.json({ owned: ['classic'] })
  }
})

shopRouter.post('/checkout', requireAuth, async (c) => {
  if (!isStripeEnabled || !stripe) {
    return c.json({ error: 'Purchases not available' }, 400)
  }

  const userId = c.var.userId
  const { styleId } = await c.req.json()

  const styleMeta = PREMIUM_STYLES[styleId]
  if (!styleMeta) return c.json({ error: 'Unknown style' }, 400)

  if (await userOwnsStyle(userId, styleId)) {
    return c.json({ error: 'Already owned' }, 400)
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: `Checkers — ${styleMeta.name} Piece Style`,
          description: 'One-time unlock. Applies to all future games.',
        },
        unit_amount: styleMeta.priceUsd * 100,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.APP_URL ?? 'http://localhost:3001'}/?style_purchased=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL ?? 'http://localhost:3001'}/`,
    metadata: {
      userId,
      styleId,
    },
  })

  return c.json({ checkoutUrl: session.url })
})

shopRouter.post('/confirm', requireAuth, async (c) => {
  if (!isStripeEnabled || !stripe) {
    return c.json({ error: 'Purchases not available' }, 400)
  }

  const userId = c.var.userId
  const { sessionId } = await c.req.json()

  const session = await stripe.checkout.sessions.retrieve(sessionId)

  if (session.payment_status !== 'paid') {
    return c.json({ error: 'Payment not completed' }, 400)
  }

  if (session.metadata?.userId !== userId) {
    return c.json({ error: 'Session user mismatch' }, 403)
  }

  const styleId = session.metadata?.styleId
  if (!styleId) return c.json({ error: 'Missing styleId in session' }, 400)

  await recordPurchase(userId, styleId, sessionId, session.amount_total ?? 200)

  return c.json({ ok: true, styleId })
})

export default shopRouter
