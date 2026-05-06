'use client'

import { useEffect } from 'react'

export function useSSE(url: string, onMessage: (data: string) => void) {
  useEffect(() => {
    const es = new EventSource(url, { withCredentials: true })
    es.onmessage = (e: MessageEvent) => onMessage(e.data)
    es.onerror = () => {}
    return () => es.close()
  }, [url])
}
