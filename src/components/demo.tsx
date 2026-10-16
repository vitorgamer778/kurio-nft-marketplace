import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { post, get, message, refresh } from "../lib/api";
import { useSession } from "./session";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
export function Demo() {
  const { notify } = useSession(),
    [open, setOpen] = useState(false),
    [enabled] = useState(() => {
      if (
        ["1", '"1"'].includes(
          new URLSearchParams(location.search).get("demo") || "",
        )
      )
        sessionStorage.setItem("kurio.demo", "1");
      return sessionStorage.getItem("kurio.demo") === "1";
    });
  const scenario = useQuery({
    queryKey: ["demo"],
    queryFn: ({ signal }) => get<{ scenario: string }>("/demo", signal),
    enabled,
  });
  const action = async (path: string, data?: unknown) => {
    try {
      await post("/demo/" + path, data);
      await refresh();
      notify("Cenário atualizado.");
    } catch (e) {
      notify(message(e));
    }
  };
  if (!enabled) return null;
  return (
    <>
      <Button
        className="demo-toggle"
        variant="outline"
        onClick={() => setOpen(true)}
      >
        Cenários de teste
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Cenários reproduzíveis">
        <p>
          Controles de avaliação. Todas as alterações passam pelos handlers MSW.
        </p>
        <label className="field">
          <span>Condição da simulação</span>
          <select
            aria-label="Cenário"
            value={scenario.data?.scenario || "standard"}
            disabled={scenario.isPending}
            onChange={(e) => action("scenario", { scenario: e.target.value })}
          >
            {[
              ["standard", "Padrão"],
              ["slow", "Rede lenta"],
              ["variable", "Latência variável"],
              ["offline", "Sem conexão"],
              ["server-error", "Erro 503"],
              ["empty", "Catálogo vazio"],
              ["expired", "Sessão expirada"],
              ["favorite-error", "Falha de favorito"],
              ["declined", "Pagamento recusado"],
              ["order-timeout", "Timeout após criar pedido"],
            ].map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="demo-actions">
          {[
            ["price", "Alterar preço"],
            ["stock", "Esgotar edição"],
            ["duplicate", "Evento duplicado"],
            ["old", "Evento antigo"],
            ["disconnect", "Interromper conexão"],
          ].map(([kind, label]) => (
            <Button
              variant="outline"
              key={kind}
              onClick={() => action("event", { kind })}
            >
              {label}
            </Button>
          ))}
          <Button
            variant="outline"
            onClick={async () => {
              await post("/session/expire");
              await refresh();
            }}
          >
            Expirar sessão
          </Button>
          <Button
            onClick={async () => {
              await post("/demo/reset");
              localStorage.removeItem("kurio.token");
              sessionStorage.clear();
              location.href = "/?demo=1";
            }}
          >
            Restaurar cenário inicial
          </Button>
        </div>
      </Dialog>
    </>
  );
}
