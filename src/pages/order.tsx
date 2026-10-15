import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "@tanstack/react-router";
import { Clock, TriangleAlert } from "lucide-react";
import type { Order as OrderType } from "../lib/contracts";
import { get, message } from "../lib/api";
import { useSession } from "../components/session";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { ErrorState, Skeleton } from "../components/common";
export function Order() {
  const { id } = useParams({ strict: false }) as { id: string },
    { user } = useSession(),
    [explorer, setExplorer] = useState(false);
  const q = useQuery({
    queryKey: ["order", user?.id, id],
    queryFn: ({ signal }) => get<OrderType>("/orders/" + id, signal),
    refetchInterval: (query) =>
      query.state.data?.status === "pending" ? 800 : false,
    retry: 1,
  });
  if (q.isPending) return <Skeleton />;
  if (q.isError)
    return (
      <ErrorState
        error={new Error(message(q.error))}
        retry={() => q.refetch()}
      />
    );
  const o = q.data;
  return (
    <section className="receipt">
      <Link className="receipt-close" to="/" aria-label="Fechar recibo">
        ×
      </Link>
      <div className="receipt-title">
        {o.status === "pending" ? (
          <Clock size={60} />
        ) : o.status === "declined" ? (
          <TriangleAlert size={60} />
        ) : (
          <img className="thank-you" src="/assets/21283.svg" alt="" />
        )}
        <h1>
          {o.status === "confirmed"
            ? "Seus NFTs agora estão na sua carteira"
            : o.status === "pending"
              ? "Seu pedido está sendo processado"
              : "Pagamento recusado"}
        </h1>
        <p>
          {o.status === "pending"
            ? "Acompanhe a confirmação. Você pode recarregar esta página com segurança."
            : o.status === "declined"
              ? "Os itens foram preservados no carrinho. Tente novamente com outra carteira."
              : "Compra confirmada na simulação."}
        </p>
      </div>
      <div className="receipt-meta">
        <span>
          ID do pedido
          <br />
          <b>{o.id.slice(0, 8)}</b>
        </span>
        <span>
          Data
          <br />
          {new Date(o.created).toLocaleDateString("pt-BR")}
        </span>
        <span>
          Total
          <br />
          {o.quote.total} ETH
        </span>
        <span>
          Carteira
          <br />
          {o.wallet.provider}
        </span>
      </div>
      <div className="receipt-body">
        <h2>Detalhes da transação</h2>
        <div className="receipt-head">
          <span>NFTs</span>
          <span>Edições</span>
          <span>Subtotal</span>
        </div>
        {o.quote.items.map((i) => (
          <div className="receipt-item" key={i.nftId + i.edition}>
            <img src={i.image} alt={i.name} width="64" height="64" />
            <span>
              <strong>{i.name}</strong>
              <small>Edição {i.edition}</small>
            </span>
            <span>(× {i.quantity})</span>
            <strong className="price">{i.subtotal} ETH</strong>
          </div>
        ))}
        <dl>
          <div>
            <dt>Subtotal</dt>
            <dd>{o.quote.subtotal} ETH</dd>
          </div>
          <div>
            <dt>Desconto</dt>
            <dd>{o.quote.discount} ETH</dd>
          </div>
          <div>
            <dt>Taxa de rede</dt>
            <dd>{o.quote.fee} ETH</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd className="price">{o.quote.total} ETH</dd>
          </div>
        </dl>
        {o.status === "confirmed" ? (
          <>
            <p>
              Transação confirmada na {o.network}. A propriedade foi transferida
              para a carteira conectada nesta simulação.
            </p>
            <Button onClick={() => setExplorer(true)}>Ver no Etherscan</Button>
          </>
        ) : o.status === "declined" ? (
          <Button asChild>
            <Link to="/checkout">Voltar ao pagamento</Link>
          </Button>
        ) : (
          <p role="status" aria-live="polite">
            Aguardando confirmação…
          </p>
        )}
      </div>
      <Dialog
        open={explorer}
        onOpenChange={setExplorer}
        title="Transação simulada"
      >
        <p>
          Esta referência pertence ao ambiente simulado; não existe uma
          transação em exploradores públicos.
        </p>
        <code className="transaction">{o.transaction}</code>
        <p>Rede: {o.network}</p>
      </Dialog>
    </section>
  );
}
