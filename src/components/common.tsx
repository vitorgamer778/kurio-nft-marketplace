import {
  useState,
  useId,
  type ReactNode,
  type InputHTMLAttributes,
} from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "../lib/api";
import type { NFT } from "../lib/contracts";
import { Button } from "./ui/button";
import { Eye, EyeOff } from "lucide-react";
import { SlideControls } from "./slide-controls";
export function Field({
  label,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const generatedId = useId();
  const id = props.id || generatedId;
  return (
    <label className="field" htmlFor={id}>
      <span>
        {label}
        {props.required && <b className="required"> *</b>}
      </span>
      <input
        {...props}
        id={id}
        aria-label={props["aria-label"] || label}
        aria-invalid={!!error}
        aria-describedby={error ? id + "-error" : undefined}
      />
      {error && (
        <span id={id + "-error"} className="error">
          {error}
        </span>
      )}
    </label>
  );
}
export function Password({
  label,
  name,
  required = true,
  minLength = 8,
  error,
}: {
  label: string;
  name: string;
  required?: boolean;
  minLength?: number;
  error?: string;
}) {
  const [show, setShow] = useState(false);
  const id = useId();
  return (
    <label className="field password">
      <span>{label}</span>
      <div>
        <input
          name={name}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? id + "-error" : undefined}
          aria-label={label}
          type={show ? "text" : "password"}
          required={required}
          minLength={minLength}
          autoComplete={
            name === "current" ? "current-password" : "new-password"
          }
        />
        <button
          type="button"
          aria-label={show ? "Ocultar " + label : "Mostrar " + label}
          onClick={() => setShow(!show)}
        >
          {show ? <Eye size={17} /> : <EyeOff size={17} />}
        </button>
      </div>
      {error && (
        <span id={id + "-error"} className="error">
          {error}
        </span>
      )}
    </label>
  );
}
export function Skeleton({ cards = false }: { cards?: boolean }) {
  return (
    <div
      aria-label="Carregando"
      role="status"
      className={cards ? "nft-grid" : "skeleton-container"}
    >
      {Array.from({ length: cards ? 9 : 3 }, (_, i) => (
        <div key={i} className={"skeleton " + (cards ? "skeleton-card" : "")} />
      ))}
      <span className="sr-only">Carregando dados…</span>
    </div>
  );
}
export function ErrorState({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  return (
    <div className="empty" role="alert">
      <h2>Não foi possível carregar</h2>
      <p>
        {error instanceof Error
          ? error.message
          : "Tente novamente em instantes."}
      </p>
      {retry && <Button onClick={retry}>Tentar novamente</Button>}
      <Link to="/">Voltar ao início</Link>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <h2>{title}</h2>
      {children}
      <Button asChild>
        <Link to="/">Explorar NFTs</Link>
      </Button>
    </div>
  );
}
export function NFTCard({
  nft,
  compact = false,
  priority = false,
}: {
  nft: NFT;
  compact?: boolean;
  priority?: boolean;
}) {
  return (
    <article className={"nft-card " + (compact ? "compact" : "")}>
      <Link
        to="/nft/$id"
        params={{ id: nft.id }}
        className="art-wrap"
        aria-label={"Ver " + nft.name}
      >
        <img
          src={nft.image.replace(".webp", "-300.webp")}
          srcSet={
            nft.image.replace(".webp", "-300.webp") +
            " 300w, " +
            nft.image.replace(".webp", "-600.webp") +
            " 600w, " +
            nft.image +
            " 900w"
          }
          sizes="(max-width:599px) calc((100vw - 64px)/2), 250px"
          alt={nft.name}
          width="250"
          height="250"
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
        />
      </Link>
      <Link to="/nft/$id" params={{ id: nft.id }} className="nft-name">
        {nft.name}
      </Link>
      <p className="price">
        {nft.price} ETH{" "}
        {nft.previousPrice && <del>{nft.previousPrice} ETH</del>}
      </p>
    </article>
  );
}
export function Related() {
  const [page, setPage] = useState(0);
  const q = useQuery({
    queryKey: ["nfts", "related", page],
    queryFn: ({ signal }) =>
      get<{ items: NFT[] }>("/nfts?page=" + (page + 1), signal),
  });
  return (
    <section className="related">
      <h2>Mais desta coleção</h2>
      {q.isError ? (
        <ErrorState
          error={new Error("Não foi possível carregar a coleção.")}
          retry={() => q.refetch()}
        />
      ) : (
        <div
          className="related-grid"
          id="related-slides"
          aria-live="polite"
          aria-busy={q.isPending}
        >
          {q.isPending
            ? Array.from({ length: 5 }, (_, i) => (
                <div className="skeleton skeleton-card" key={i} />
              ))
            : q.data?.items
                .slice(3, 8)
                .map((n) => <NFTCard key={n.id} nft={n} compact />)}
        </div>
      )}
      <SlideControls
        className="carousel-dots"
        label="Página da coleção"
        controls="related-slides"
        value={page}
        onChange={setPage}
      />
    </section>
  );
}
export function Breadcrumb({ label }: { label: string }) {
  return (
    <div className="breadcrumb">
      <Link to="/">Início</Link> / <span>{label}</span>
    </div>
  );
}
