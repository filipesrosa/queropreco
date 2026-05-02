const BASE_URL = process.env.ZAPNIT_BASE_URL
const INSTANCE_ID = process.env.ZAPNIT_INSTANCE_ID
const CLIENT_TOKEN = process.env.ZAPNIT_CLIENT_TOKEN

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('55') && digits.length >= 12) return digits
  return `55${digits}`
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<void> {
  if (!BASE_URL || !INSTANCE_ID || !CLIENT_TOKEN) {
    throw new Error('Missing Zapnit environment variables')
  }

  const response = await fetch(`${BASE_URL}/instances/${INSTANCE_ID}/send-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Token': CLIENT_TOKEN,
    },
    body: JSON.stringify({ phone: normalizePhone(phone), message }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Zapnit API error ${response.status}: ${text}`)
  }
}
