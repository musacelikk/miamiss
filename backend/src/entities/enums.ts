export enum Role {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}

export enum CouponType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export enum CouponSource {
  ADMIN = 'ADMIN',
  PUZZLE = 'PUZZLE',
}

export enum GiftCardStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  DEPLETED = 'DEPLETED',
  DISABLED = 'DISABLED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  COD = 'COD',
  CARD = 'CARD',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum OrderItemType {
  PRODUCT = 'PRODUCT',
  GIFT_CARD = 'GIFT_CARD',
}
