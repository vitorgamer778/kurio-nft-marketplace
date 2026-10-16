import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import type { Cart as CartType, Quote, NFT, CartItem } from "../lib/contracts";
import { get, post, put, queryClient, message } from "../lib/api";
import { multiply } from "../lib/money";
import { availableQuantity } from "../lib/inventory";
import { useSession } from "../components/session";
import { Button } from "../components/ui/button";
import {
  Breadcrumb,
  Skeleton,
  ErrorState,
  Empty,
  Related,
} from "../components/common";
import { Footer } from "../components/layout";
export function useCart() {
  const { user } = useSession();
  return useQuery({
    queryKey: ["cart", user?.id ?? "guest"],
    queryFn: ({ signal }) => get<CartType>("/cart", signal),
  });
}
export function useQuote(enabled = true) {
  const { user } = useSession();
  return useQuery({
    queryKey: ["quote", user?.id ?? "guest"],
    queryFn: () => post<Quote>("/quote"),
    enabled,
    retry: false,
  });
}
export function Summary({
  quote,
  children,
}: {
  quote: Quote;
  children?: React.ReactNode;
}) {
  return (
    <section className="summary">
      <h2>Resumo do pedido</h2>
      <dl>
        <div>
          <dt>Subtotal</dt>
          <dd>{quote.subtotal} ETH</dd>
        </div>
        <div>
          <dt>Desconto {quote.coupon}</dt>
          <dd>−{quote.discount} ETH</dd>
        </div>
        <div>
          <dt>Taxa de rede</dt>
          <dd>{quote.fee} ETH</dd>
        </div>
        <div className="total">
          <dt>Total</dt>
          <dd>{quote.total} ETH</dd>
        </div>
      </dl>
      {children}
    </section>
  );
}
export function Cart() {
  const { notify } = useSession(),
    cart = useCart(),
    q = useQuote(!!cart.data?.items.length),
    [coupon, setCoupon] = useState("");
  const nfts = useQuery({
    queryKey: ["nfts", "cart", cart.data?.items],
    queryFn: async ({ signal }) => ({
      items: await Promise.all(
        (cart.data?.items || []).map((item) =>
          get<NFT>("/nfts/" + item.nftId, signal),
        ),
      ),
    }),
    enabled: !!cart.data?.items.length,
  });
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    queryClient.invalidateQueries({ queryKey: ["quote"] });
  };
  const edit = useMutation({
    mutationFn: (item: CartItem) => put<CartType>("/cart/items", item),
    onSuccess: invalidate,
    onError: (e) => notify(message(e)),
  });
  const apply = useMutation({
    mutationFn: (value: string) => put("/cart/coupon", { coupon: value }),
    onSuccess: () => {
      invalidate();
      notify("Cupom atualizado.");
    },
    onError: (e) => notify(message(e)),
  });
  if (cart.isPending) return <Skeleton />;
  if (cart.isError)
    return (
      <ErrorState
        error={new Error(message(cart.error))}
        retry={() => cart.refetch()}
      />
    );
  return (
    <>
      <Breadcrumb label="Carrinho de NFTs" />
      <h1 className="mobile-page-title">Carrinho de NFTs</h1>
      {!cart.data.items.length ? (
        <Empty title="Seu carrinho está vazio">
          <p>Encontre uma obra para começar sua coleção.</p>
        </Empty>
      ) : (
        <div className="cart-layout">
          <div>
            <div className="cart-table-head">
              <span>NFTs</span>
              <span>Preço</span>
              <span>Quantidade</span>
              <span>Subtotal</span>
              <span />
            </div>
            {cart.data.items.map((item) => {
              const line = q.data?.items.find(
                  (n) => n.nftId === item.nftId && n.edition === item.edition,
                ),
                nft = nfts.data?.items.find((n) => n.id === item.nftId);
              return (
                <article className="cart-row" key={item.nftId + item.edition}>
                  <Link
                    to="/nft/$id"
                    params={{ id: item.nftId }}
                    className="cart-art"
                  >
                    {line?.image || nft?.image ? (
                      <img
                        src={line?.image || nft?.image}
                        alt={line?.name || nft?.name || "Arte do NFT"}
                        width="72"
                        height="72"
                      />
                    ) : (
                      <div
                        className="skeleton"
                        style={{ width: 72, height: 72 }}
                        aria-label="Carregando arte"
                      />
                    )}
                    <span>
                      {line?.name || nft?.name || item.nftId}
                      <small>Edição {item.edition}</small>
                    </span>
                  </Link>
                  <span>{line?.price || nft?.price || "—"} ETH</span>
                  <label className="cart-quantity">
                    <span className="sr-only">
                      Quantidade de {line?.name || item.nftId}
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={
                        nft
                          ? availableQuantity(
                              nft,
                              item.edition,
                              cart.data.items,
                            )
                          : item.quantity
                      }
                      value={item.quantity}
                      disabled={edit.isPending}
                      onChange={(e) => {
                        const quantity = Number(e.target.value);
                        if (quantity >= 1) edit.mutate({ ...item, quantity });
                      }}
                    />
                  </label>
                  <strong className="price">
                    {line?.subtotal ||
                      (nft ? multiply(nft.price, item.quantity) : "—")}{" "}
                    ETH
                  </strong>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={"Remover " + (line?.name || item.nftId)}
                    disabled={edit.isPending}
                    onClick={() => edit.mutate({ ...item, quantity: 0 })}
                  >
                    <Trash2 size={17} />
                  </Button>
                </article>
              );
            })}
            <div className="coupon">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  apply.mutate(coupon);
                }}
              >
                <input
                  aria-label="Código do cupom"
                  placeholder="Código do cupom"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                />
                <Button variant="outline" disabled={apply.isPending}>
                  Aplicar cupom
                </Button>
              </form>
              {cart.data.coupon && (
                <Button variant="ghost" onClick={() => apply.mutate("")}>
                  Remover {cart.data.coupon}
                </Button>
              )}
              <small>Experimente KURIO10 para 10% de desconto.</small>
            </div>
            <Link className="continue-shopping" to="/">
              Continuar explorando
            </Link>
          </div>
          <div>
            {q.isPending ? (
              <Skeleton />
            ) : q.isError ? (
              <ErrorState
                error={new Error(message(q.error))}
                retry={() => q.refetch()}
              />
            ) : (
              q.data && (
                <Summary quote={q.data}>
                  <Button asChild className="full">
                    <Link to="/checkout">Finalizar compra</Link>
                  </Button>
                  <small>Compra simulada. Nenhuma cobrança real.</small>
                </Summary>
              )
            )}
          </div>
        </div>
      )}
      <Related />
      <Footer />
    </>
  );
}
