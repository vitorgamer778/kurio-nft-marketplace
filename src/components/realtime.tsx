import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { queryClient } from "../lib/api";
import type { ResourceEvent } from "../lib/contracts";
import { useSession } from "./session";
export function Realtime() {
  const { user, notify } = useSession(),
    [connected, setConnected] = useState(false);
  useEffect(() => {
    let alive = true;
    let socket: Socket | undefined;
    const versions = new Map<string, number>();
    const reconcile = () => {
      if (!alive) return;
      setConnected(true);
      socket?.emit("subscribe", { token: localStorage.getItem("kurio.token") });
      queryClient.invalidateQueries();
    };
    const event = (type: string) => (data: ResourceEvent) => {
      if (!alive || (data.userId && data.userId !== user?.id)) return;
      const key = type + data.resourceId;
      if ((versions.get(key) || 0) >= data.version) return;
      versions.set(key, data.version);
      queryClient.invalidateQueries({
        predicate: (q) =>
          type === "nft"
            ? ["nfts", "nft", "cart", "quote"].includes(String(q.queryKey[0]))
            : ["order", "orders", "cart", "quote", "nfts"].includes(
                String(q.queryKey[0]),
              ),
      });
      if (type === "nft")
        notify(
          "Preço ou disponibilidade atualizado. Revise os valores antes de comprar.",
        );
    };
    import("socket.io-client").then(({ io }) => {
      if (!alive) return;
      socket = io("https://kurio.mock", {
        path: "/socket.io/",
        transports: ["websocket"],
        reconnectionDelay: 500,
      });
      socket.on("connect", reconcile);
      socket.on("disconnect", () => setConnected(false));
      socket.on("nft.updated", event("nft"));
      socket.on("order.updated", event("order"));
      socket.on("demo.disconnect", () => {
        socket?.disconnect();
        setConnected(false);
        setTimeout(() => {
          if (alive) socket?.connect();
        }, 1500);
      });
    });
    return () => {
      alive = false;
      socket?.removeAllListeners();
      socket?.disconnect();
    };
  }, [user?.id, notify]);
  return (
    <span
      className="connection"
      aria-label={
        connected
          ? "Atualizações em tempo real conectadas"
          : "Reconectando atualizações"
      }
      title={connected ? "Tempo real conectado" : "Reconectando…"}
    >
      {connected ? "●" : "○"}
    </span>
  );
}
