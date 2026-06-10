import mongoose, { Schema, Document } from 'mongoose'

export interface IPurchase extends Document {
  userId: string
  styleId: string
  stripeSessionId: string
  amountCents: number
  purchasedAt: Date
}

const PurchaseSchema = new Schema({
  userId:          { type: String, required: true },
  styleId:         { type: String, required: true },
  stripeSessionId: { type: String, required: true, unique: true },
  amountCents:     { type: Number, required: true },
  purchasedAt:     { type: Date,   required: true, default: Date.now },
})

PurchaseSchema.index({ userId: 1, styleId: 1 })

export const Purchase = mongoose.model<IPurchase>('Purchase', PurchaseSchema)
