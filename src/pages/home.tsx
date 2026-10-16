import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { SlidersHorizontal, Search as SearchIcon } from "lucide-react";
import type { NFT, Search } from "../lib/contracts";
import { collections, networks } from "../lib/contracts";
import { get, message } from "../lib/api";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { NFTCard, Skeleton, ErrorState } from "../components/common";
import { Footer } from "../components/layout";
import { Tabs } from "../components/tabs";
import { SlideControls } from "../components/slide-controls";
export function Home() {
  const search = useSearch({ strict: false }) as Search,
    navigate = useNavigate(),
    [filters, setFilters] = useState(false),
    [min, setMin] = useState(search.min || "0.02"),
    [max, setMax] = useState(search.max || "12.30"),
    [info, setInfo] = useState("");
  const [slide, setSlide] = useState(0);
  const slides = [
    {
      desktop: ["SEJA DONO DO FUTURO", "DA ARTE DIGITAL"],
      mobile: ["SEJA DONO DA", "CULTURA DIGITAL"],
      image: "8f387",
      small: "83794",
      alt: "Emerald Ape, macaco com óculos verdes e jaqueta esmeralda",
    },
    {
      desktop: ["ENCONTRE SUA", "PRÓXIMA OBRA"],
      mobile: ["ENCONTRE SUA", "PRÓXIMA OBRA"],
      image: "83794",
      small: "9add2",
      alt: "Sage Nomad, macaco de chapéu e roupa violeta",
    },
    {
      desktop: ["COLECIONE ARTE", "COM IDENTIDADE"],
      mobile: ["COLECIONE ARTE", "COM IDENTIDADE"],
      image: "b7cfc",
      small: "8f387",
      alt: "Golden Beat, macaco dourado com fones de ouvido",
    },
  ];
  const highlight = slides[slide];
  useEffect(() => {
    setMin(search.min || "0.02");
    setMax(search.max || "12.30");
  }, [search.min, search.max]);
  const update = (part: Partial<Search>) =>
    navigate({
      to: "/",
      search: { ...search, ...part, page: part.page ?? 1 },
      resetScroll: false,
    });
  const toggle = (key: "collections" | "networks", value: string) => {
    const selected = (search[key] || "").split(",").filter(Boolean);
    update({
      [key]:
        (selected.includes(value)
          ? selected.filter((v) => v !== value)
          : [...selected, value]
        ).join(",") || undefined,
    });
  };
  const params = new URLSearchParams(
    Object.entries(search)
      .filter(([k, v]) => k !== "demo" && v !== undefined && v !== "")
      .map(([k, v]) => [k, String(v)]),
  );
  const q = useQuery({
    queryKey: ["nfts", params.toString()],
    queryFn: ({ signal }) =>
      get<{
        items: NFT[];
        pages: number;
        total: number;
        facets: {
          collections: Record<string, number>;
          networks: Record<string, number>;
        };
      }>("/nfts?" + params, signal),
  });
  const filterContent = (
    <div className="filters">
      <label className="field filter-sort">
        <span>Ordenação</span>
        <select
          aria-label="Ordenar resultados"
          value={search.sort || "recent"}
          onChange={(e) => update({ sort: e.target.value })}
        >
          <option value="recent">Listados recentemente</option>
          <option value="price-asc">Menor preço</option>
          <option value="price-desc">Maior preço</option>
        </select>
      </label>
      <h2>Coleções</h2>
      <div className="filter-options">
        {collections.map((c) => (
          <label
            key={c}
            className={
              (search.collections || "").split(",").includes(c)
                ? "selected"
                : ""
            }
          >
            <input
              aria-label={c + " (" + (q.data?.facets.collections[c] ?? 0) + ")"}
              type="checkbox"
              checked={(search.collections || "").split(",").includes(c)}
              onChange={() => toggle("collections", c)}
            />
            <span>{c}</span>
            <span>({q.data?.facets.collections[c] ?? 0})</span>
          </label>
        ))}
      </div>
      <h2>Faixa de preço</h2>
      <div className="price-controls">
        <input
          aria-label="Preço máximo"
          type="range"
          min="0.02"
          max="12.3"
          step="0.01"
          value={max}
          onChange={(e) => setMax(e.target.value)}
        />
        <div className="price-inputs">
          <label>
            Mín.
            <input
              aria-label="Preço mínimo em ETH"
              value={min}
              type="number"
              step=".01"
              min="0"
              onChange={(e) => setMin(e.target.value)}
            />
          </label>
          <label>
            Máx.
            <input
              aria-label="Preço máximo em ETH"
              value={max}
              type="number"
              step=".01"
              min="0"
              onChange={(e) => setMax(e.target.value)}
            />
          </label>
        </div>
        <p>
          Preço: {min} - {max} ETH
        </p>
        <Button
          size="sm"
          onClick={() => {
            if (Number(min) <= Number(max) && Number(min) >= 0)
              update({ min, max });
            else setInfo("O preço mínimo deve ser menor ou igual ao máximo.");
          }}
        >
          Aplicar
        </Button>
      </div>
      <h2>Rede</h2>
      <div className="filter-options">
        {networks.map((n) => (
          <label key={n}>
            <input
              aria-label={n + " (" + (q.data?.facets.networks[n] ?? 0) + ")"}
              type="checkbox"
              checked={(search.networks || "").split(",").includes(n)}
              onChange={() => toggle("networks", n)}
            />
            <span>{n}</span>
            <span>({q.data?.facets.networks[n] ?? 0})</span>
          </label>
        ))}
      </div>
      {(search.collections || search.networks || search.min || search.max) && (
        <Button
          variant="ghost"
          onClick={() => {
            setMin("0.02");
            setMax("12.30");
            update({
              collections: undefined,
              networks: undefined,
              min: undefined,
              max: undefined,
            });
          }}
        >
          Limpar filtros
        </Button>
      )}
    </div>
  );
  return (
    <>
      <div className="mobile-search">
        <label>
          <SearchIcon size={20} />
          <input
            aria-label="Buscar NFTs"
            placeholder="Explorar coleções"
            value={search.q || ""}
            onChange={(e) => update({ q: e.target.value || undefined })}
          />
        </label>
        <Button
          size="icon"
          aria-label="Abrir filtros"
          onClick={() => setFilters(true)}
        >
          <SlidersHorizontal />
        </Button>
      </div>
      <section
        className="hero"
        aria-label="Destaques"
        aria-roledescription="carrossel"
      >
        <div className="hero-copy">
          <p>Bem-vindo à Kurio</p>
          <h1 id="hero-slide" aria-live="polite" aria-atomic="true">
            <span className="desktop-title">
              {highlight.desktop[0]}
              <br />
              {highlight.desktop[1]}
            </span>
            <span className="mobile-title">
              {highlight.mobile[0]}
              <br />
              {highlight.mobile[1]}
            </span>
          </h1>
          <p className="hero-description">
            Descubra NFTs selecionados de criadores emergentes e consagrados.
            Colecione arte digital rara, apoie artistas e tenha uma parte da
            cultura da internet.
          </p>
          <Button asChild>
            <a href="#catalogo">EXPLORAR</a>
          </Button>
          <SlideControls
            className="hero-dots"
            label="Destaque"
            controls="hero-slide"
            value={slide}
            onChange={setSlide}
          />
        </div>
        <img
          className="hero-art"
          src={`/assets/${highlight.image}-300.webp`}
          srcSet={`/assets/${highlight.image}-300.webp 300w, /assets/${highlight.image}-600.webp 600w, /assets/${highlight.image}.webp 900w`}
          sizes="(max-width:599px) 138px, (max-width:900px) 38vw, 450px"
          alt={highlight.alt}
          width="450"
          height="450"
          fetchPriority="high"
        />
        <img
          className="hero-small"
          src={`/assets/${highlight.small}-300.webp`}
          alt=""
          width="64"
          height="64"
        />
      </section>
      <section className="catalog" id="catalogo">
        <aside>
          {filterContent}
          <div className="featured">
            <h2>NFT EM DESTAQUE</h2>
            <h3>OFERTA LIMITADA</h3>
            <Link to="/nft/$id" params={{ id: "nft-4" }}>
              <img
                src="/assets/83794.webp"
                alt="Cosmic Bloom em destaque"
                loading="lazy"
                width="310"
                height="368"
              />
            </Link>
          </div>
        </aside>
        <div className="catalog-main">
          <label className="desktop-search" id="busca">
            <SearchIcon size={17} />
            <input
              aria-label="Buscar no catálogo"
              placeholder="Buscar NFTs"
              value={search.q || ""}
              onChange={(e) => update({ q: e.target.value || undefined })}
            />
          </label>
          <div className="catalog-toolbar">
            <Tabs
              id="catalog"
              label="Catálogo"
              value={search.tab || "all"}
              onChange={(tab) => update({ tab })}
              tabs={[
                ["all", "Todos os NFTs"],
                ["new", "Novos lançamentos"],
                ["trending", "Em alta"],
              ]}
            />
            <label>
              Ordenar por:
              <select
                aria-label="Ordenar NFTs"
                value={search.sort || "recent"}
                onChange={(e) => update({ sort: e.target.value })}
              >
                <option value="recent">Listados recentemente</option>
                <option value="price-asc">Menor preço</option>
                <option value="price-desc">Maior preço</option>
              </select>
            </label>
          </div>
          <div
            id="catalog-panel"
            role="tabpanel"
            aria-labelledby={`catalog-${search.tab || "all"}-tab`}
            tabIndex={0}
          >
            {q.isPending ? (
              <Skeleton cards />
            ) : q.isError ? (
              <ErrorState
                error={new Error(message(q.error))}
                retry={() => q.refetch()}
              />
            ) : q.data.items.length ? (
              <>
                <div className="nft-grid">
                  {q.data.items.map((n, index) => (
                    <NFTCard key={n.id} nft={n} priority={index < 4} />
                  ))}
                </div>
                <nav className="pagination" aria-label="Páginas do catálogo">
                  {Array.from({ length: q.data.pages }, (_, i) => (
                    <button
                      key={i}
                      aria-label={"Página " + (i + 1)}
                      aria-current={
                        (search.page || 1) === i + 1 ? "page" : undefined
                      }
                      onClick={() => update({ page: i + 1 })}
                    >
                      {i + 1}
                    </button>
                  ))}
                </nav>
              </>
            ) : (
              <div className="empty">
                <h2>Nenhum NFT encontrado</h2>
                <p>Tente outra busca ou remova os filtros.</p>
                <Button onClick={() => navigate({ to: "/", search: {} })}>
                  Limpar busca e filtros
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="promos" id="criadores">
        {[
          [
            "8f387.webp",
            "Lançamentos gênesis de edição limitada",
            "Colecione edições escassas diretamente dos criadores antes da revelação pública.",
          ],
          [
            "9add2.webp",
            "Arte digital selecionada e muito mais",
            "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura.",
          ],
        ].map(([img, title, text]) => (
          <article key={title}>
            <img
              src={"/assets/" + img}
              alt=""
              loading="lazy"
              width="292"
              height="250"
            />
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
              <Button asChild size="sm">
                <a href="#catalogo">Explorar</a>
              </Button>
            </div>
          </article>
        ))}
      </section>
      <section className="journal" id="diario">
        <h2>Diário da Cunhagem</h2>
        <p>
          Histórias, guias e insights para colecionadores sobre o universo da
          propriedade digital.
        </p>
        <div>
          {[
            "Como funciona a propriedade de NFTs",
            "10 artistas digitais para acompanhar",
            "Raridade, atributos e procedência",
            "Como proteger sua carteira",
          ].map((title, i) => (
            <article key={title}>
              <img
                src={
                  "/assets/" +
                  ["9add2.webp", "8f387.webp", "83794.webp", "b7cfc.webp"][i]
                }
                alt=""
                width="268"
                height="195"
                loading="lazy"
              />
              <div>
                <small>
                  {12 + i} de setembro | Leitura de {i + 2} min
                </small>
                <h3>{title}</h3>
                <p>
                  {
                    [
                      "Aprenda a colecionar, negociar e verificar ativos digitais.",
                      "Conheça criadores que moldam a cultura digital.",
                      "Entenda raridade, procedência, direitos autorais e utilidade.",
                      "Proteja sua carteira, seus ativos e sua identidade.",
                    ][i]
                  }
                </p>
                <button
                  onClick={() =>
                    setInfo(
                      "Os artigos editoriais não fazem parte do escopo desta demonstração.",
                    )
                  }
                >
                  Ler mais →
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      <Footer />
      <Dialog
        open={filters}
        onOpenChange={setFilters}
        title="Filtrar NFTs"
        className="filter-dialog"
      >
        {filterContent}
        <Button onClick={() => setFilters(false)}>Ver resultados</Button>
      </Dialog>
      <Dialog open={!!info} onOpenChange={() => setInfo("")} title="Kurio">
        <p>{info}</p>
      </Dialog>
    </>
  );
}
