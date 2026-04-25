'use client'
import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export function useSocket(token: string | null, onNotification: (notif: unknown) => void) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) return
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    })
    socket.on('new_notification', onNotification)
    socket.on('connect_error', () => {})
    socketRef.current = socket
    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token, onNotification])

  return socketRef
}
