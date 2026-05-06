import { Client } from 'pg'
import { EventEmitter } from 'events'

export const notifyEmitter = new EventEmitter()
notifyEmitter.setMaxListeners(1000)

async function connect(): Promise<Client> {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  await client.query('LISTEN reading_created')
  await client.query('LISTEN donation_updated')

  client.on('notification', (msg) => {
    if (msg.channel && msg.payload) {
      notifyEmitter.emit(msg.channel, msg.payload)
    }
  })

  client.on('error', (err) => {
    console.error('[pg-notify] connection error, reconnecting in 5s:', err.message)
    client.end().catch(() => {})
    setTimeout(() => connect().catch(console.error), 5000)
  })

  return client
}

export async function startPgListener(): Promise<void> {
  await connect()
}
