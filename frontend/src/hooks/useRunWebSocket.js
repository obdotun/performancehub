import { useEffect, useRef, useCallback } from 'react'
import { Client } from '@stomp/stompjs'

/**
 * URL WebSocket dynamique :
 * - En dev (Vite sur :3000) → ws://localhost:8085/ws-native
 * - En prod (Nginx sur :80) → ws://monserveur.com/ws-native
 *
 * window.location.host retourne l'hôte courant (sans le port en prod sur :80)
 */
function getWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host     = import.meta.env.DEV
    ? 'localhost:8085'       // dev : backend sur port différent
    : window.location.host  // prod : même hôte que le frontend (Nginx proxy)
  return `${protocol}//${host}/ws-native`
}

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

    const wsUrl = getWsUrl()
    console.debug(`[PerfHub] WebSocket → ${wsUrl}`)

    const client = new Client({
      brokerURL: wsUrl,
      reconnectDelay: 3000,
      onConnect: () => {
        console.log(`[PerfHub] ✅ WebSocket connecté — run #${runId}`)
        client.subscribe(`/topic/runs/${runId}/logs`, msg => onLog?.(msg.body))
        client.subscribe(`/topic/runs/${runId}/done`, msg => {
          try { onDone?.(JSON.parse(msg.body)) } catch { onDone?.({}) }
          disconnect()
        })
      },
      onStompError:    frame => console.error('[PerfHub] STOMP error', frame),
      onWebSocketError: err  => console.error('[PerfHub] WS error', err),
    })

    client.activate()
    clientRef.current = client
    return disconnect
  }, [runId])

  return { disconnect }
}