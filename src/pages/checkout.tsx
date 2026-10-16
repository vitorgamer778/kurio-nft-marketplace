import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import type { Wallet, Quote, Order } from "../lib/contracts";
import { get, post, queryClient, message } from "../lib/api";
import { useSession } from "../components/session";
import { useCart, useQuote, Summary } from "./cart";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import {
  Field,
  Breadcrumb,
  Skeleton,
  ErrorState,
  Empty,
} from "../components/common";
import { Footer } from "../components/layout";
import { isAxiosError } from "axios";
import { useFormValidation } from "../components/form-validation";
type Attempt = {
  key: string;
  input: {
    fingerprint: string;
    walletId: string;
    network: string;
    collector: Order["collector"];
  };
};
export function Checkout() {
  const validation = useFormValidation();
  const submitting = useRef(false);
  const { user, notify } = useSession(),
    navigate = useNavigate(),
    cart = useCart(),
    q = useQuote(!!cart.data?.items.length),
    wallets = useQuery({
      queryKey: ["wallets", user?.id],
      queryFn: ({ signal }) => get<Wallet[]>("/wallets", signal),
    }),
    [walletId, setWalletId] = useState(""),
    [network, setNetwork] = useState(""),
    [connected, setConnected] = useState(""),
    [review, setReview] = useState<Quote | null>(null),
    [collector, setCollector] = useState<Order["collector"]>(() => {
      const initial = {
        name: user?.name || "",
        email: user?.email || "",
        username: user?.username || "",
        profileName: user?.name || "",
        referral: "KURIO",
        ens: user?.ens || "colecionador.eth",
        note: "",
        secondary: "",
      };
      try {
        return {
          ...initial,
          ...JSON.parse(
            sessionStorage.getItem("kurio.checkout.draft." + user?.id) || "{}",
          ),
        };
      } catch {
        return initial;
      }
    }),
    [error, setError] = useState("");
  const attemptKey = "kurio.attempt." + user?.id;
  const [attempt, setAttempt] = useState<Attempt | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(attemptKey) || "null");
    } catch {
      return null;
    }
  });
  const wallet = wallets.data?.find((w) => w.id === walletId);
  useEffect(() => {
    if (user?.id)
      sessionStorage.setItem(
        "kurio.checkout.draft." + user.id,
        JSON.stringify(collector),
      );
  }, [collector, user?.id]);
  useEffect(() => {
    try {
      setAttempt(JSON.parse(sessionStorage.getItem(attemptKey) || "null"));
    } catch {
      setAttempt(null);
    }
  }, [attemptKey]);
  const connect = useMutation({
    mutationFn: (refuse: boolean) =>
      post<{ connected: boolean }>("/wallets/connect", {
        walletId,
        network,
        refuse,
      }),
    onSuccess: (r) => {
      setConnected(r.connected ? walletId : "");
      notify(
        r.connected
          ? "Carteira conectada na simulação."
          : "Conexão recusada. Você pode tentar novamente.",
      );
    },
    onError: (e) => setError(message(e)),
  });
  const order = useMutation({
    mutationFn: async (saved: Attempt) => {
      const result = await post<Order>("/orders", saved.input, {
        "Idempotency-Key": saved.key,
      });
      return result;
    },
    onSuccess: (result) => {
      sessionStorage.removeItem(attemptKey);
      setAttempt(null);
      setReview(null);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigate({ to: "/order/$id", params: { id: result.id } });
    },
    onError: (e) => {
      validation.fail(e);
      const text = message(e);
      const code = isAxiosError(e) ? e.response?.data?.code : undefined;
      if (
        code === "QUOTE_CHANGED" ||
        code === "QUOTE_INVALID" ||
        (isAxiosError(e) && e.response?.status === 422)
      ) {
        sessionStorage.removeItem(attemptKey);
        setAttempt(null);
        setReview(null);
        queryClient.invalidateQueries({ queryKey: ["quote"] });
        setError(
          text +
            " Nenhum pedido foi criado; revise os dados e confirme novamente.",
        );
        notify(text);
        return;
      }
      setError(
        text +
          " A tentativa está salva; recuperar não cria uma compra duplicada.",
      );
      notify(text);
    },
    onSettled: () => {
      submitting.current = false;
    },
  });
  const reviewOrder = async () => {
    setError("");
    validation.clear();
    try {
      const latest = await post<Quote>("/quote");
      queryClient.setQueryData(["quote", user?.id ?? "guest"], latest);
      setReview(latest);
    } catch (e) {
      setError(message(e));
    }
  };
  const confirm = async () => {
    if (!review || !wallet || attempt || submitting.current) return;
    submitting.current = true;
    setError("");
    try {
      const latest = await post<Quote>("/quote");
      if (latest.fingerprint !== review.fingerprint) {
        queryClient.setQueryData(["quote", user?.id ?? "guest"], latest);
        setReview(null);
        setError(
          "Preço ou disponibilidade mudou. Revise o resumo e confirme novamente.",
        );
        submitting.current = false;
        return;
      }
      const saved: Attempt = {
        key: crypto.randomUUID(),
        input: {
          fingerprint: review.fingerprint,
          walletId,
          network,
          collector,
        },
      };
      sessionStorage.setItem(attemptKey, JSON.stringify(saved));
      setAttempt(saved);
      order.mutate(saved);
    } catch (e) {
      submitting.current = false;
      setReview(null);
      setError(message(e));
    }
  };
  if (cart.isPending || wallets.isPending) return <Skeleton />;
  if (cart.isError || wallets.isError)
    return (
      <ErrorState
        error={new Error(message(cart.error || wallets.error))}
        retry={() => {
          cart.refetch();
          wallets.refetch();
        }}
      />
    );
  if (!cart.data.items.length && !attempt)
    return <Empty title="Adicione NFTs antes de finalizar" />;
  return (
    <>
      <Breadcrumb label="Pagamento" />
      <h1 className="mobile-page-title">Pagamento com carteira</h1>
      <div className="checkout-layout">
        <form
          id="checkout-form"
          ref={validation.formRef}
          className="checkout-form"
          onChange={(e) => {
            const fields = new FormData(e.currentTarget);
            setCollector({
              name: String(fields.get("name") || ""),
              email: String(fields.get("email") || ""),
              username: String(fields.get("username") || ""),
              profileName: String(fields.get("profileName") || ""),
              referral: String(fields.get("referral") || ""),
              ens: String(fields.get("ens") || ""),
              note: String(fields.get("note") || ""),
              secondary: String(fields.get("secondary") || ""),
            });
          }}
          onSubmit={(e) => {
            e.preventDefault();
            const fields = new FormData(e.currentTarget);
            setCollector({
              ...collector,
              username: String(fields.get("username")),
              profileName: String(fields.get("profileName")),
              referral: String(fields.get("referral")),
              ens: String(fields.get("ens")),
              note: String(fields.get("note") || ""),
              secondary: String(fields.get("secondary") || ""),
            });
            reviewOrder();
          }}
        >
          <h1>Dados do colecionador</h1>
          <div className="form-grid">
            <Field
              label="Nome de exibição"
              name="name"
              error={validation.fields.name}
              required
              value={collector.name}
              onChange={(e) =>
                setCollector({ ...collector, name: e.target.value })
              }
            />
            <Field
              label="E-mail"
              name="email"
              error={validation.fields.email}
              type="email"
              required
              value={collector.email}
              onChange={(e) =>
                setCollector({ ...collector, email: e.target.value })
              }
            />
            <Field
              label="Nome de usuário"
              name="username"
              error={validation.fields.username}
              required
              defaultValue={collector.username}
            />
            <Field
              label="Nome do perfil"
              name="profileName"
              error={validation.fields.profileName}
              required
              defaultValue={collector.profileName}
            />
            <Field
              label="Endereço da carteira"
              name="address"
              readOnly
              value={wallet?.address || ""}
              placeholder="Endereço 0x da carteira"
            />
            <Field
              label="Tipo de carteira"
              name="provider"
              readOnly
              value={wallet?.provider || ""}
              placeholder="Selecione uma carteira"
            />
            <Field
              label="Código de indicação"
              name="referral"
              error={validation.fields.referral}
              required
              defaultValue={collector.referral}
            />
            <Field
              label="Nome ENS"
              name="ens"
              error={validation.fields.ens}
              required
              defaultValue={collector.ens}
            />
            <Field
              label="ENS ou carteira secundária (opcional)"
              name="secondary"
              error={validation.fields.secondary}
              defaultValue={collector.secondary}
            />
          </div>
          <label className="field collector-note">
            <span>Observação do colecionador (opcional)</span>
            <textarea name="note" rows={5} defaultValue={collector.note} />
          </label>
          <label className="checkbox-line">
            <input type="checkbox" required />
            Confirmo os dados do colecionador nesta simulação.
          </label>
          <h2>Carteira conectada</h2>
          {wallets.data.length === 0 ? (
            <p>
              Cadastre uma carteira para continuar.{" "}
              <Link to="/wallets">Gerenciar carteiras</Link>
            </p>
          ) : (
            wallets.data.map((w) => (
              <label className="wallet-option" key={w.id}>
                <input
                  type="radio"
                  name="wallet"
                  checked={walletId === w.id}
                  required
                  onChange={() => {
                    setWalletId(w.id);
                    setNetwork(w.network);
                    setConnected("");
                  }}
                />
                <span>
                  <strong>
                    {w.name}
                    {w.primary ? " · Principal" : ""}
                  </strong>
                  <span>
                    {w.address.length > 22
                      ? w.address.slice(0, 8) + "…" + w.address.slice(-4)
                      : w.address}
                  </span>
                  <span>Rede {w.network}</span>
                </span>
              </label>
            ))
          )}
          <div className="network-select">
            <label>
              Rede
              <select
                aria-label="Rede da carteira"
                required
                value={network}
                onChange={(e) => {
                  setNetwork(e.target.value);
                  setConnected("");
                }}
              >
                <option value="">Selecione a rede</option>
                {["Ethereum", "Polygon", "Solana"].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <Link to="/wallets">Trocar carteira</Link>
          </div>
          <h2>Carteira e rede</h2>
          <div className="providers">
            {["WalletConnect", "MetaMask", "Coinbase Wallet"].map((name, i) => (
              <div
                className={
                  "provider " + (wallet?.provider === name ? "selected" : "")
                }
                key={name}
              >
                <b>{["W", "M", "C"][i]}</b>
                {name}
                <span>{wallet?.provider === name ? "◉" : "○"}</span>
              </div>
            ))}
          </div>
          <div className="connect-actions">
            <Button
              type="button"
              disabled={!wallet || connect.isPending}
              variant="outline"
              onClick={() =>
                connected ? setConnected("") : connect.mutate(false)
              }
            >
              {connected ? "Desconectar" : "Simular conexão"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!wallet || connect.isPending}
              onClick={() => connect.mutate(true)}
            >
              Simular recusa
            </Button>
          </div>
          {connected && (
            <p role="status">
              Conectada · {wallet?.provider} · {network}
            </p>
          )}
        </form>
        <aside>
          {q.isPending ? (
            <Skeleton />
          ) : q.isError ? (
            <ErrorState
              error={new Error(message(q.error))}
              retry={() => q.refetch()}
            />
          ) : (
            q.data && (
              <>
                <div className="checkout-items">
                  <h2>Seu pedido</h2>
                  {q.data.items.map((i) => (
                    <div key={i.nftId + i.edition}>
                      <img src={i.image} alt={i.name} width="48" height="48" />
                      <span>
                        {i.name}
                        <small>
                          {i.quantity} × {i.price} ETH · {i.edition}
                        </small>
                      </span>
                      <strong>{i.subtotal} ETH</strong>
                    </div>
                  ))}
                </div>
                <Summary quote={q.data}>
                  <Button
                    className="full"
                    form="checkout-form"
                    disabled={
                      !connected ||
                      connected !== walletId ||
                      order.isPending ||
                      !!attempt
                    }
                  >
                    Revisar compra
                  </Button>
                  <small>As carteiras e transações são simuladas.</small>
                </Summary>
              </>
            )
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {attempt && (
            <div className="recovery">
              <h2>Recuperar tentativa salva</h2>
              <p>Consulte o mesmo pedido após uma interrupção de conexão.</p>
              <Button
                disabled={order.isPending}
                onClick={() => order.mutate(attempt)}
              >
                {order.isPending ? "Recuperando…" : "Recuperar pedido"}
              </Button>
            </div>
          )}
        </aside>
      </div>
      <Footer />
      <Dialog
        open={!!review}
        onOpenChange={(open) => {
          if (!order.isPending && !open) setReview(null);
        }}
        title="Revise sua compra"
      >
        {review && (
          <>
            <p>
              {collector.name} · {collector.email}
            </p>
            <p>
              {wallet?.name} · {network}
            </p>
            <Summary quote={review} />
            <p>
              Confirme os NFTs, quantidades e total. Nenhum pagamento real será
              efetuado.
            </p>
            <Button
              disabled={order.isPending || !!attempt}
              className="full"
              onClick={confirm}
            >
              {order.isPending ? "Enviando pedido…" : "Confirmar compra"}
            </Button>
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
          </>
        )}
      </Dialog>
    </>
  );
}
