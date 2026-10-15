import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Home,
  Heart,
  ShoppingCart,
  UserRound,
  Menu,
  ScanLine,
} from "lucide-react";
import { get } from "../lib/api";
import type { Cart } from "../lib/contracts";
import { useSession } from "./session";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { Realtime } from "./realtime";
export function Header() {
  const { user } = useSession(),
    [menu, setMenu] = useState(false),
    { location } = useRouterState(),
    { data } = useQuery({
      queryKey: ["cart", user?.id ?? "guest"],
      queryFn: ({ signal }) => get<Cart>("/cart", signal),
    });
  const count = data?.items.reduce((s, i) => s + i.quantity, 0) || 0;
  return (
    <>
      <header className="header">
        <Link to="/" className="wordmark">
          KURIO
        </Link>
        <nav aria-label="Navegação principal">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            activeProps={{ className: "active" }}
          >
            Início
          </Link>
          <a
            href="/#catalogo"
            className={
              location.pathname.startsWith("/nft") ||
              location.pathname === "/cart"
                ? "active"
                : ""
            }
          >
            Mercado
          </a>
          <a href="/#criadores">Criadores</a>
          <a href="/#diario">Aprenda</a>
        </nav>
        <div className="header-actions">
          <a href="/#busca" aria-label="Buscar NFTs">
            <img src="/assets/bd8c9.svg" alt="" />
          </a>
          <Link
            to="/cart"
            className="cart-link"
            aria-label={"Carrinho, " + count + " itens"}
          >
            <img src="/assets/c0c08.svg" alt="" />
            <span>{count}</span>
          </Link>
          <Button asChild size="sm">
            <Link to={user ? "/profile" : "/login"}>
              {user ? (
                <UserRound size={16} />
              ) : (
                <img src="/assets/62554.svg" alt="" />
              )}
              {user ? "Meu perfil" : "Entrar"}
            </Link>
          </Button>
          <Button
            className="mobile-menu"
            variant="ghost"
            size="icon"
            aria-label="Abrir menu"
            onClick={() => setMenu(true)}
          >
            <Menu />
          </Button>
        </div>
      </header>
      <Dialog open={menu} onOpenChange={setMenu} title="Navegação">
        <nav className="drawer-links" onClick={() => setMenu(false)}>
          <Link to="/">Início</Link>
          <Link to="/cart">Carrinho</Link>
          <Link to="/profile">Meu perfil</Link>
          <Link to="/wallets">Carteiras</Link>
          <Link to="/favorites">Favoritos</Link>
        </nav>
      </Dialog>
    </>
  );
}
export function Footer() {
  const [info, setInfo] = useState("");
  const feature = [
    [
      "W",
      "Segurança da carteira",
      "Proteja sua carteira e colecione arte digital verificada com confiança.",
    ],
    [
      "C",
      "Criadores em destaque",
      "Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.",
    ],
    [
      "D",
      "Alertas de lançamentos",
      "Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.",
    ],
  ];
  return (
    <>
      <footer className="footer">
        <div className="footer-features">
          {feature.map(([icon, title, description]) => (
            <div key={title}>
              <b className="medallion">{icon}</b>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
          <div>
            <h3>Antecipe-se ao próximo lançamento</h3>
            <form
              className="newsletter"
              onSubmit={(e) => {
                e.preventDefault();
                setInfo(
                  "Newsletter fora do escopo da demonstração. Nenhum e-mail foi cadastrado.",
                );
              }}
            >
              <input
                aria-label="E-mail para novidades"
                placeholder="digite seu e-mail..."
                type="email"
                required
              />
              <Button size="sm">Enviar</Button>
            </form>
            <p>
              Receba lançamentos selecionados, histórias de criadores e
              novidades do mercado.
            </p>
          </div>
        </div>
        <div className="brand-band">
          <b className="wordmark">KURIO</b>
          <span>
            Feito para colecionadores,
            <br />
            criadores e cultura
          </span>
          <span>contato@email.com</span>
          <span>+55 11 4002 8922</span>
        </div>
        <div className="footer-columns">
          <div>
            <h3>Meu perfil</h3>
            <Link to="/profile">Meu perfil</Link>
            <Link to="/orders">Minha coleção</Link>
            {["Atividade", "Estúdio do criador"].map((t) => (
              <button
                key={t}
                onClick={() =>
                  setInfo(t + " não está disponível nesta demonstração.")
                }
              >
                {t}
              </button>
            ))}
            <Link to="/favorites">Lista de interesse</Link>
          </div>
          <div>
            <h3>Central de ajuda</h3>
            {[
              "Central de ajuda",
              "Como comprar NFTs",
              "Carteira e segurança",
              "Política do mercado",
              "Denunciar item",
            ].map((t) => (
              <button
                key={t}
                onClick={() =>
                  setInfo(t + " não está disponível nesta demonstração.")
                }
              >
                {t}
              </button>
            ))}
          </div>
          <div>
            <h3>Coleções</h3>
            {[
              "Arte digital",
              "Fotografia",
              "Música",
              "Arte 3D",
              "Utilidade",
            ].map((t) => (
              <Link key={t} to="/" search={{ collections: t, page: 1 }}>
                {t}
              </Link>
            ))}
          </div>
          <div>
            <h3>Redes sociais</h3>
            <div className="socials">
              {["99280", "d48dd", "b4111", "b8b84", "ca2da"].map((id, i) => (
                <button
                  key={id}
                  aria-label={
                    ["Facebook", "Instagram", "Twitter", "LinkedIn", "YouTube"][
                      i
                    ]
                  }
                  onClick={() =>
                    setInfo("Os canais sociais são ilustrativos neste desafio.")
                  }
                >
                  <img src={"/assets/" + id + ".svg"} alt="" />
                </button>
              ))}
            </div>
            <h3>Carteiras compatíveis</h3>
            <p className="wallet-chip">METAMASK • WALLETCONNECT • COINBASE</p>
          </div>
        </div>
        <p className="copyright">
          © 2026 Kurio. Propriedade digital para todos.
        </p>
      </footer>
      <Dialog
        open={!!info}
        onOpenChange={() => setInfo("")}
        title="Demonstração"
      >
        <p>{info}</p>
      </Dialog>
    </>
  );
}
export function Layout() {
  const { location } = useRouterState();
  const receipt = location.pathname.startsWith("/order/");
  return (
    <>
      <a className="skip-link" href="#main">
        Pular para conteúdo
      </a>
      <div className={"site " + (location.pathname === "/" ? "home-site" : "")}>
        {!receipt && <Header />}
        <main id="main">
          <Outlet />
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Navegação mobile">
        <Link to="/" aria-label="Início">
          <Home />
        </Link>
        <Link to="/favorites" aria-label="Favoritos">
          <Heart />
        </Link>
        <a className="scan" href="/#busca" aria-label="Explorar coleções">
          <ScanLine />
        </a>
        <Link to="/cart" aria-label="Carrinho">
          <ShoppingCart />
        </Link>
        <Link to="/profile" aria-label="Perfil">
          <UserRound />
        </Link>
      </nav>
      <Realtime />
    </>
  );
}
