# Contratos REST e eventos

Base: /api. Todas as operações da aplicação usam Axios. JSON UTF-8; ETH é string decimal; quantidades inteiras; timestamps em milissegundos Unix. Tipos compartilhados em src/lib/contracts.ts.

Autorização: Authorization: Bearer <token fictício>. Cadastro/login, catálogo e carrinho do visitante não exigem sessão. Perfil, favoritos, carteiras e pedidos exigem sessão. Carrinho usa o token quando presente; token inválido não dá acesso silencioso ao carrinho visitante.

| Método e rota | Entrada | Resposta |
|---|---|---|
| POST /session/register | name, email, password | ok; 409 para e-mail existente |
| POST /session/login | email, password | token, user, expires |
| GET /session | token | user, expires |
| POST /session/logout | — | ok |
| POST /session/expire | — | ok; utilitário da simulação |
| GET /nfts | q, collections CSV, networks CSV, min/max ETH, sort, tab, page | items: NFT[], total, pages, page |
| GET /nfts/:id | — | NFT; 404 quando ausente |
| GET /favorites | token | string[] de IDs |
| PUT /favorites/:id | active: boolean | string[] atualizada |
| GET /cart | token opcional | items: CartItem[], coupon |
| PUT /cart/items | nftId, edition, quantity | cart; quantity=0 remove; 409 se indisponível |
| PUT /cart/coupon | coupon string, vazia remove | cart; 422 inválido/expirado |
| POST /quote | token opcional | items, subtotal, discount, fee, total, coupon, fingerprint |
| POST /orders | fingerprint, walletId, network, collector | Order pending ou pedido existente |
| GET /orders | token | Order[] do usuário |
| GET /orders/:id | token | Order com snapshot; 403 se de outro usuário |
| GET /profile | token | User |
| PATCH /profile | name, username, email, ens, nickname, avatar | User; 409 em conflito |
| PUT /profile/password | current, password | ok; 422 senha inválida |
| GET /wallets | token | Wallet[] |
| PUT /wallets/:id | name, address, network, provider, primary | Wallet[]; 422 em validação |
| POST /wallets/connect | walletId, network, refuse | connected: boolean |
| GET /demo | — | scenario atual |
| POST /demo/scenario | scenario | ok |
| POST /demo/reset | — | restaura todo o cenário |
| POST /demo/event | kind: price, stock, duplicate, old, disconnect | altera banco e emite por Socket.IO |

Sort aceita recent, price-asc, price-desc. Tab aceita all, new, trending. Paginação usa 9 itens e fixtures têm 36 NFTs, com nove categorias, três redes e pelo menos uma peça esgotada.

POST /orders exige Idempotency-Key. A identidade é usuário + chave. Chave repetida com o mesmo payload recupera a mesma transação; conteúdo diferente retorna 409. Não repetir com nova chave após timeout: recuperar a tentativa salva.

Avatar é data URL PNG/JPEG/WebP de arquivo validado pela UI até 500 KB. Endereço de carteira aceita 0x + 40 caracteres hexadecimais ou ENS .eth. Redes simuladas: Ethereum, Polygon, Solana. Provedores simulados: MetaMask, WalletConnect, Coinbase Wallet.

Erros retornam {message: string, fields: Record<string,string>}. HTTP 401: sessão inválida/expirada; 403: recurso de outro usuário; 404: não encontrado; 409: conflito; 422: validação; 503: falha transitória. Offline e timeout após criação produzem falha de transporte.

Eventos:

| Evento | Payload | Efeito |
|---|---|---|
| nft.updated | id, resourceId, version | invalida catálogo, detalhe, carrinho e cotação |
| order.updated | id, resourceId, version, userId | reconsulta pedido e recursos afetados |
| demo.disconnect | objeto vazio | cenário de interrupção e reconexão |

Eventos não transportam preços para setters: REST é a fonte de verdade. Versões repetidas/menores são ignoradas; eventos de pedidos são isolados por usuário. A reconexão reconsulta recursos para recuperar alterações perdidas.
