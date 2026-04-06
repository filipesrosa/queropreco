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
