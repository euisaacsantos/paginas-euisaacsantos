import Redis from 'ioredis'

let client

export function getRedis() {
  if (!client) {
    if (!process.env.REDIS_URL) {
      throw new Error('REDIS_URL ausente nas env vars')
    }
    client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    })
    client.on('error', (err) => console.error('[redis]', err.message))
  }
  return client
}
