import { Purchase } from './purchase.model'

export async function getPurchasedStyles(userId: string): Promise<string[]> {
  const records = await Purchase.find({ userId }, { styleId: 1 }).lean()
  return records.map(r => r.styleId)
}

export async function userOwnsStyle(userId: string, styleId: string): Promise<boolean> {
  const exists = await Purchase.exists({ userId, styleId })
  return !!exists
}

export async function recordPurchase(
  userId: string,
  styleId: string,
  stripeSessionId: string,
  amountCents: number,
): Promise<void> {
  await Purchase.findOneAndUpdate(
    { stripeSessionId },
    { userId, styleId, stripeSessionId, amountCents, purchasedAt: new Date() },
    { upsert: true }
  )
}
