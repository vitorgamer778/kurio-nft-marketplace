import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useNavigate } from "@tanstack/react-router";
import { Heart, Minus, Plus } from "lucide-react";
import type { NFT, Cart } from "../lib/contracts";
import { get, put, queryClient, message } from "../lib/api";
import { useSession } from "../components/session";
import {
  Breadcrumb,
  Skeleton,
  ErrorState,
  Related,
} from "../components/common";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Footer } from "../components/layout";
export function Detail() {
  const { id } = useParams({ strict: false }) as { id: string },
    navigate = useNavigate(),
    { user, notify } = useSession(),
    [edition, setEdition] = useState("1/50"),
    [quantity, setQuantity] = useState(1),
    [zoom, setZoom] = useState(false),
    [tab, setTab] = useState("details");
  const q = useQuery({
    queryKey: ["nft", id],
    queryFn: ({ signal }) => get<NFT>("/nfts/" + id, signal),
  });
  const key = ["favorites", user?.id];
  const favorites = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => get<string[]>("/favorites", signal),
    enabled: !!user,
  });
  const active = favorites.data?.includes(id) ?? false;
  const favorite = useMutation({
    mutationFn: (next: boolean) =>
      put<string[]>("/favorites/" + id, { active: next }),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key) || [];
      queryClient.setQueryData(
        key,
        next ? [...previous, id] : previous.filter((n) => n !== id),
      );
      return { previous };
    },
    onError: (e, _v, context) => {
      queryClient.setQueryData(key, context?.previous);
      notify(message(e));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const buy = useMutation({
    mutationFn: async () => {
      const cart = await get<Cart>("/cart"),
        existing = cart.items.find(
          (i) => i.nftId === id && i.edition === edition,
        );
      return put<Cart>("/cart/items", {
        nftId: id,
        edition,
        quantity: quantity + (existing?.quantity || 0),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["quote"] });
      notify("NFT adicionado ao carrinho.");
      navigate({ to: "/cart" });
    },
    onError: (e) => notify(message(e)),
  });
  if (q.isPending) return <Skeleton />;
  if (q.isError)
    return (
      <ErrorState
        error={new Error(message(q.error))}
        retry={() => q.refetch()}
      />
    );
  const n = q.data,
    max = Math.min(
      n.stock,
      edition === "1/1" ? 1 : edition === "1/10" ? 10 : 50,
    );
  return (
    <>
      <Breadcrumb label="Mercado" />
      <section className="detail">
        <div className="gallery">
          <div className="thumbnails">
            {[0, 1, 2, 3].map((i) => (
              <button
                key={i}
                aria-label={"Ampliar imagem " + (i + 1)}
                onClick={() => setZoom(true)}
              >
                <img src={n.image} alt="" width="100" height="100" />
              </button>
            ))}
          </div>
          <button
            className="main-art"
            onClick={() => setZoom(true)}
            aria-label="Ampliar arte"
          >
            <img src={n.image} alt={n.name} width="420" height="420" />
          </button>
        </div>
        <div className="detail-info">
          <h1>{n.name}</h1>
          <div className="detail-price">
            <strong>{n.price} ETH</strong>
            <span>
              ★★★★★ <small>19 avaliações de colecionadores</small>
            </span>
          </div>
          <h2>Sobre este NFT:</h2>
          <p>
            Um colecionável digital finalizado à mão da coleção Kurio Editions,
            verificado na {n.network} com arte desbloqueável e acesso para
            colecionadores.
          </p>
          <h2>Edição:</h2>
          <div className="edition-list">
            {n.editions.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setEdition(e);
                  setQuantity(1);
                }}
                aria-pressed={e === edition}
              >
                {e}
              </button>
            ))}
          </div>
          <div className="purchase-row">
            <div className="quantity">
              <Button
                aria-label="Diminuir quantidade"
                size="icon"
                disabled={quantity <= 1}
                onClick={() => setQuantity(quantity - 1)}
              >
                <Minus size={14} />
              </Button>
              <output aria-label="Quantidade">{quantity}</output>
              <Button
                aria-label="Aumentar quantidade"
                size="icon"
                disabled={quantity >= max}
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={14} />
              </Button>
            </div>
            <Button
              disabled={max < 1 || quantity > max || buy.isPending}
              onClick={() => buy.mutate()}
            >
              {buy.isPending
                ? "ADICIONANDO…"
                : max < 1
                  ? "ESGOTADO"
                  : "COMPRAR"}
            </Button>
            <Button
              variant="outline"
              disabled={favorite.isPending}
              onClick={() =>
                user
                  ? favorite.mutate(!active)
                  : navigate({
                      to: "/login",
                      search: { redirect: "/nft/" + id },
                    })
              }
              aria-pressed={active}
            >
              <Heart size={17} fill={active ? "currentColor" : "none"} />
              Favoritar
            </Button>
          </div>
          <p className="availability">
            {n.stock === 0
              ? "Edição indisponível"
              : n.stock + " disponíveis · máximo " + max + " nesta edição"}
          </p>
          <p>ID do token: #{n.name.split("#")[1]?.slice(0, 3)}</p>
          <p>Coleção: Kurio Apes</p>
          <p>Atributos: Óculos, Esmeralda, {n.rarity}</p>
          <p className="share">
            Compartilhar este NFT:{" "}
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(location.href);
                notify("Link copiado.");
              }}
            >
              Copiar link
            </button>
          </p>
        </div>
      </section>
      <section className="detail-description">
        <div
          className="detail-tabs"
          role="tablist"
          aria-label="Informações do NFT"
        >
          <button
            role="tab"
            aria-selected={tab === "details"}
            onClick={() => setTab("details")}
          >
            Detalhes do NFT
          </button>
          <button
            role="tab"
            aria-selected={tab === "reviews"}
            onClick={() => setTab("reviews")}
          >
            Avaliações de colecionadores (19)
          </button>
        </div>
        {tab === "details" ? (
          <div role="tabpanel">
            <p>
              {n.name} é uma obra digital finalizada à mão da coleção Kurio
              Editions. Cada atributo fica armazenado nos metadados do token e
              verificado na {n.network}. A obra explora identidade, movimento e
              luz em um mundo digital sem fronteiras.
            </p>
            <p>
              A propriedade inclui a arte em alta resolução, lançamentos
              exclusivos para colecionadores e um registro permanente de
              procedência registrada na rede. Nova Sato recebe 5% de direitos
              autorais nas vendas secundárias, apoiando novos trabalhos e
              lançamentos da comunidade.
            </p>
            <h3>Rede:</h3>
            <p>
              Cunhado na {n.network} com procedência imutável e metadados
              armazenados em IPFS.
            </p>
            <h3>Contrato:</h3>
            <p>
              Direitos autorais do criador: 5% nas vendas secundárias, pagos
              automaticamente pelos mercados compatíveis.
            </p>
            <h3>Direitos autorais:</h3>
            <p>0x742…19C8 · Contrato inteligente ERC-721 verificado.</p>
            <small>
              Informações ilustrativas do desafio. Nenhum ativo real será
              transferido.
            </small>
          </div>
        ) : (
          <div role="tabpanel">
            <p>
              As avaliações editoriais são ilustrativas no layout. Publicação de
              avaliações não faz parte desta demonstração.
            </p>
          </div>
        )}
      </section>
      <Related />
      <Footer />
      <Dialog
        open={zoom}
        onOpenChange={setZoom}
        title={n.name}
        className="image-dialog"
      >
        <img src={n.image} alt={n.name} width="650" height="650" />
      </Dialog>
    </>
  );
}
