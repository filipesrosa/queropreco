export interface Establishment {
  name: string
  cnpj: string
  address: string
  website?: string
}

export interface Invoice {
  number: string
  series: string
  issuedAt: string
  capturedAt: string
  accessKey: string
  authorizationProtocol: string
  environment: string
  xmlVersion: string
  xsltVersion: string
  type: string
  via: string
  consumer: string
  operator: string
}

export interface Payment {
  totalItems: number
  totalAmount: number
  amountPaid: number
  change: number
  method: string
}

export interface Taxes {
  totalTaxes: number
  taxPercentage: number
  taxSource: string
  legalBasis: string
}

export interface Item {
  code: string
  description: string
  quantity: number
  unit: string
  unitPrice: number
  totalPrice: number
}

export interface NFCeReceipt {
  establishment: Establishment
  invoice: Invoice
  payment: Payment
  taxes: Taxes
  items: Item[]
  notes?: string
}

export interface ItemGroupEstablishment {
  name: string
  cnpj: string
  lastPrice: number
  lastSeenAt: string
}

export interface ItemGroup {
  key: string
  description: string
  productName: string | null
  occurrences: number
  minPrice: number
  maxPrice: number
  lastSeenAt: string
  establishments: ItemGroupEstablishment[]
}

export interface ItemDetailRecord {
  id: string
  description: string
  unitPrice: number
  quantity: number
  unit: string
  establishment: { name: string; cnpj: string; address: string }
  issuedAt: string
}

export interface ItemDetail {
  key: string
  description: string
  productName: string | null
  history: ItemDetailRecord[]
  byEstablishment: ItemDetailRecord[]
}

export interface EstItemEntry {
  key: string
  description: string
  price: number
  issuedAt: string
  stale: boolean
}

export interface EstablishmentSummary {
  cnpj: string
  name: string
  address: string
  lastVisit: string
  itemCount: number
  priceIndex: number | null
  items: EstItemEntry[]
}

export interface ProductPrice {
  price: number
  issuedAt: string
  stale: boolean
}

export interface ProductComparison {
  key: string
  description: string
  bestPrice: number
  bestCnpj: string
  maxSavings: number
  prices: Record<string, ProductPrice>
}

export interface CompareData {
  establishments: EstablishmentSummary[]
  products: ProductComparison[]
  totalProducts: number
}
