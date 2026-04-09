'use client'
import { useEffect } from 'react'

export function SessionInit() {
  useEffect(() => {
    if (!localStorage.getItem('qp_session_id')) {
      localStorage.setItem('qp_session_id', crypto.randomUUID())
    }
  }, [])
  return null
}
