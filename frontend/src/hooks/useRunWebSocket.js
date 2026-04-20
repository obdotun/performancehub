import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'

/**
 * WebSocket NATIF — sans SockJS.
 *
 * Pourquoi sans SockJS :
 * - SockJS résout ses URLs de polling en relatif par rapport à window.location
 * - Quand Vite tourne sur :3000 et le backend sur :8085, SockJS génère des
 *   requêtes parasites comme /api/projects/s1 (session SockJS) qui polluent
 *   les appels API et causent des 403/404.
 * - @stomp/stompjs v7 supporte nativement WebSocket sans SockJS via brokerURL.
 * - Le backend expose /ws-native (WebSocket pur) en plus de /ws (SockJS).
 */
const WS_URL = 'ws://localhost:8085/ws-native'

export function useRunWebSocket(runId, onLog, onDone) {
  const clientRef = useRef(null)

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      try { clientRef.current.deactivate() } catch {}
      clientRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!runId) return
    disconnect()

    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,

      onConnect: () => {
        console.log(`[PerfHub] ✅ WebSocket connecté — run #${runId}`)

        client.subscribe(`/topic/runs/${runId}/logs`, (msg) => {
          onLog?.(msg.body)
        })

        client.subscribe(`/topic/runs/${runId}/done`, (msg) => {
          console.log(`[PerfHub] Run #${runId} terminé`)
          try { onDone?.(JSON.parse(msg.body)) } catch { onDone?.({}) }
          disconnect()
        })
      },

      onStompError: (frame) => {
        console.error('[PerfHub] STOMP error', frame)
      },

      onDisconnect: () => {
        console.debug('[PerfHub] WebSocket déconnecté')
      },

      onWebSocketError: (error) => {
        console.error('[PerfHub] WebSocket error', error)
      },
    })

    client.activate()
    clientRef.current = client

    return disconnect
  }, [runId])

  return { disconnect }
}