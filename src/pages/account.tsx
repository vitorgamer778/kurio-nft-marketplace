import { useState, type ReactNode } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  UserRound,
  Wallet as WalletIcon,
  Heart,
  LogOut,
  ImagePlus,
} from "lucide-react";
import type { User, Wallet, NFT, Order } from "../lib/contracts";
import { get, put, patch, queryClient, message } from "../lib/api";
import { useSession } from "../components/session";
import {
  Field,
  Password,
  Skeleton,
  ErrorState,
  Empty,
  NFTCard,
} from "../components/common";
import { Button } from "../components/ui/button";
export function AccountLayout({ children }: { children: ReactNode }) {
  const { logout, notify } = useSession();
  return (
    <div className="account-layout">
      <aside className="account-nav">
        <h2>Meu perfil</h2>
        <Link to="/profile" activeProps={{ className: "active" }}>
          <UserRound size={17} />
          Dados do perfil
        </Link>
        <Link to="/wallets" activeProps={{ className: "active" }}>
          <WalletIcon size={17} />
          Carteiras
        </Link>
        <Link to="/orders" activeProps={{ className: "active" }}>
          Minha coleção
        </Link>
        <Link to="/favorites" activeProps={{ className: "active" }}>
          <Heart size={17} />
          Lista de interesse
        </Link>
        <span>Atividade · Fora do escopo</span>
        <span>Ofertas · Fora do escopo</span>
        <span>Arquivos baixados · Fora do escopo</span>
        <span>Suporte · Fora do escopo</span>
        <button onClick={() => logout().catch((e) => notify(message(e)))}>
          <LogOut size={17} />
          Sair
        </button>
      </aside>
      <section className="account-content">{children}</section>
    </div>
  );
}
export function Profile() {
  const { user, notify } = useSession(),
    [error, setError] = useState(""),
    [avatar, setAvatar] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: ({ signal }) => get<User>("/profile", signal),
  });
  const mutation = useMutation({
    mutationFn: (data: Partial<User>) => patch<User>("/profile", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      notify("Dados do perfil salvos.");
      setError("");
    },
    onError: (e) => setError(message(e)),
  });
  const password = useMutation({
    mutationFn: (data: { current: string; password: string }) =>
      put("/profile/password", data),
    onSuccess: () => {
      notify("Senha alterada na simulação.");
      setError("");
    },
    onError: (e) => setError(message(e)),
  });
  if (q.isPending) return <Skeleton />;
  if (q.isError)
    return (
      <ErrorState
        error={new Error(message(q.error))}
        retry={() => q.refetch()}
      />
    );
  const u = q.data;
  return (
    <AccountLayout>
      <h1>Perfil do colecionador</h1>
      <form
        key={u.id}
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          const f = new FormData(e.currentTarget);
          mutation.mutate({
            name: String(f.get("name")),
            username: String(f.get("username")),
            email: String(f.get("email")),
            ens: String(f.get("ens")),
            nickname: String(f.get("nickname")),
            avatar: avatar ?? u.avatar,
          });
        }}
      >
        <div className="form-grid">
          <Field
            label="Nome de exibição"
            name="name"
            defaultValue={u.name}
            required
          />
          <Field
            label="Nome de usuário"
            name="username"
            defaultValue={u.username}
            required
          />
          <Field
            label="E-mail"
            name="email"
            type="email"
            defaultValue={u.email}
            required
          />
          <Field label="Nome ENS" name="ens" defaultValue={u.ens} />
          <Field
            label="Apelido da carteira"
            name="nickname"
            defaultValue={u.nickname}
          />
          <div className="avatar-field">
            <span>Avatar</span>
            <div>
              {(avatar ?? u.avatar) ? (
                <img
                  src={avatar ?? u.avatar}
                  alt="Seu avatar"
                  width="48"
                  height="48"
                />
              ) : (
                <ImagePlus size={36} />
              )}
              <label className="upload-button">
                Alterar
                <input
                  aria-label="Alterar avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (
                      file.size > 500_000 ||
                      !["image/png", "image/jpeg", "image/webp"].includes(
                        file.type,
                      )
                    ) {
                      setError("Selecione PNG, JPEG ou WebP com até 500 KB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setAvatar(String(reader.result));
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setAvatar("")}
              >
                Remover
              </Button>
            </div>
          </div>
        </div>
        <Button disabled={mutation.isPending}>
          {mutation.isPending ? "Salvando…" : "Salvar perfil"}
        </Button>
      </form>
      <form
        className="password-form"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          const f = new FormData(e.currentTarget);
          if (f.get("password") !== f.get("confirm")) {
            setError("As novas senhas não coincidem.");
            return;
          }
          password.mutate({
            current: String(f.get("current")),
            password: String(f.get("password")),
          });
        }}
      >
        <h2>Alterar senha</h2>
        <Password label="Senha atual" name="current" />
        <Password label="Nova senha" name="password" />
        <Password label="Confirmar nova senha" name="confirm" />
        <Button disabled={password.isPending}>Salvar senha</Button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </AccountLayout>
  );
}
function WalletForm({ wallet }: { wallet?: Wallet }) {
  const { notify } = useSession(),
    [error, setError] = useState("");
  const mutation = useMutation({
    mutationFn: (data: Wallet) => put<Wallet[]>("/wallets/" + data.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallets"] });
      notify("Carteira salva.");
      setError("");
    },
    onError: (e) => setError(message(e)),
  });
  return (
    <form
      className="wallet-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        mutation.mutate({
          id: wallet?.id || crypto.randomUUID(),
          name: String(f.get("name")),
          address: String(f.get("address")),
          network: String(f.get("network")),
          provider: String(f.get("provider")),
          primary: f.get("primary") === "on",
        });
      }}
    >
      <h2>
        {wallet?.primary
          ? "Carteira principal"
          : wallet
            ? "Carteira secundária"
            : "Cadastrar carteira"}
      </h2>
      <div className="form-grid">
        <Field
          label="Apelido da carteira"
          name="name"
          defaultValue={wallet?.name}
          required
        />
        <Field
          label="Endereço da carteira ou ENS"
          name="address"
          defaultValue={wallet?.address}
          required
        />
        <label className="field">
          <span>Rede</span>
          <select
            aria-label="Rede"
            name="network"
            defaultValue={wallet?.network || "Ethereum"}
          >
            {["Ethereum", "Polygon", "Solana"].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Provedor</span>
          <select
            aria-label="Provedor"
            name="provider"
            defaultValue={wallet?.provider || "MetaMask"}
          >
            {["MetaMask", "WalletConnect", "Coinbase Wallet"].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="checkbox-line">
        <input
          type="checkbox"
          name="primary"
          defaultChecked={wallet?.primary}
        />
        Usar como carteira principal
      </label>
      <Button disabled={mutation.isPending}>Salvar carteira</Button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}
export function Wallets() {
  const { user } = useSession(),
    q = useQuery({
      queryKey: ["wallets", user?.id],
      queryFn: ({ signal }) => get<Wallet[]>("/wallets", signal),
    });
  return (
    <AccountLayout>
      <h1>Carteiras</h1>
      <p className="muted">
        Endereços fictícios. Não conectamos extensões ou carteiras reais.
      </p>
      {q.isPending ? (
        <Skeleton />
      ) : q.isError ? (
        <ErrorState
          error={new Error(message(q.error))}
          retry={() => q.refetch()}
        />
      ) : (
        <>
          {q.data.map((w) => (
            <WalletForm key={w.id + String(w.primary)} wallet={w} />
          ))}
          {q.data.length < 2 && <WalletForm />}
        </>
      )}
    </AccountLayout>
  );
}
export function Favorites() {
  const { user } = useSession();
  const q = useQuery({
    queryKey: ["favorites", user?.id],
    queryFn: ({ signal }) => get<string[]>("/favorites", signal),
  });
  const nfts = useQuery({
    queryKey: ["nfts", "favorites", q.data],
    queryFn: async ({ signal }) =>
      Promise.all((q.data || []).map((id) => get<NFT>("/nfts/" + id, signal))),
    enabled: !!q.data,
  });
  return (
    <AccountLayout>
      <h1>Lista de interesse</h1>
      {q.isPending || nfts.isPending ? (
        <Skeleton cards />
      ) : q.isError || nfts.isError ? (
        <ErrorState error={new Error(message(q.error || nfts.error))} />
      ) : nfts.data?.length ? (
        <div className="nft-grid">
          {nfts.data.map((n) => (
            <NFTCard key={n.id} nft={n} />
          ))}
        </div>
      ) : (
        <Empty title="Você ainda não tem favoritos" />
      )}
    </AccountLayout>
  );
}
export function Orders() {
  const { user } = useSession(),
    q = useQuery({
      queryKey: ["orders", user?.id],
      queryFn: ({ signal }) => get<Order[]>("/orders", signal),
    });
  return (
    <AccountLayout>
      <h1>Minha coleção e pedidos</h1>
      {q.isPending ? (
        <Skeleton />
      ) : q.isError ? (
        <ErrorState error={new Error(message(q.error))} />
      ) : q.data.length ? (
        q.data.map((o) => (
          <Link
            className="order-list-item"
            key={o.id}
            to="/order/$id"
            params={{ id: o.id }}
          >
            <span>Pedido {o.id.slice(0, 8)}</span>
            <span>
              {o.status === "confirmed"
                ? "Confirmado"
                : o.status === "pending"
                  ? "Pendente"
                  : "Recusado"}
            </span>
            <strong>{o.quote.total} ETH</strong>
          </Link>
        ))
      ) : (
        <Empty title="Nenhuma compra por aqui ainda" />
      )}
    </AccountLayout>
  );
}
