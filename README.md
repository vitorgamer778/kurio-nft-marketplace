# Kurio — NFT Marketplace

Implementação do desafio [Jungle Gaming](https://github.com/junglegaming/frontend-challenge), em React e TypeScript. O enunciado original foi preservado em CHALLENGE.md. Identidade visual e artes provenientes do [Figma indicado](https://www.figma.com/design/Ff0SksUi7UFtPWUO8kyNtw/Frontend-Challenge?node-id=0-1).

## Executar

Requer Node.js 22+ e npm. Validado com Node 24 no Windows.

```sh
npm ci
npm run dev
```

Abra http://127.0.0.1:5173. Mocks são ativos por padrão, inclusive no build de demonstração. Opcional: copie .env.example para .env.local. VITE_ENABLE_MOCKS=false desativa os handlers; nesse caso um backend compatível precisa atender /api e o transporte de eventos deve ser configurado.

## Contas fictícias

| E-mail | Senha |
|---|---|
| colecionador@kurio.test | Kurio123! |
| artista@kurio.test | Kurio123! |

Também é possível cadastrar uma conta nova. Ela começa sem carteiras; cadastre uma em Meu perfil → Carteiras. Carteiras, pagamentos, NFTs e transações são simulados. Nunca use dados ou senhas reais.

## Fluxos

- Catálogo: busca, categorias e redes combináveis, faixa de preço, abas, ordenação e paginação na URL.
- NFT: acesso direto, galeria ampliada, edição, limite de quantidade, favorito otimista e compra.
- Carrinho: visitante/autenticado, quantidades, remoção, cupom KURIO10 e resumo validado na API.
- Pagamento: perfil do colecionador, carteiras cadastradas, rede, conexão/recusa simulada, revisão e confirmação.
- Pedidos: pendente, confirmado/recusado, recuperação após refresh/timeout e recibo imutável.
- Conta: cadastro/login/logout/expiração, favoritos privados, perfil/avatar/senha e carteiras principal/secundária.

## Cenários e reset

Abra /?demo=1 para habilitar o botão Cenários de teste. O painel permanece disponível ao navegar nessa aba. Escolha Padrão, Rede lenta, Latência variável, Sem conexão, Erro 503, Catálogo vazio, Sessão expirada, Falha de favorito, Pagamento recusado ou Timeout após criar pedido. O próprio painel continua funcionando em cenários de rede indisponível.

Restaurar cenário inicial limpa toda a base de demonstração, sessão e tentativa salva. As duas contas padrão e o catálogo são restaurados. Estado é local ao navegador.

Para reproduzir alterações durante compra: adicione Emerald Ape #042, faça login, abra o pagamento, selecione/conecte a carteira e revise. Antes de confirmar, use Alterar preço ou Esgotar edição. O socket notifica e invalida recursos; a confirmação com cotação antiga é impedida.

Para timeout: selecione Timeout após criar pedido antes de confirmar. A API grava o pedido e falha na resposta. Feche a revisão, recarregue e clique Recuperar pedido. A mesma chave recupera o mesmo pedido, sem compra duplicada.

Para recusa: escolha Pagamento recusado antes do envio. O recibo de sucesso não aparece e o carrinho fica intacto. Para testar expiração, use Expirar sessão durante checkout; login retorna ao contexto anterior.

Para eventos antigos/duplicados e desconexão, use os controles correspondentes. Todos os eventos passam por MSW + @mswjs/socket.io-binding + socket.io-client.

## Comandos

```sh
npm run typecheck
npm run lint
npm run build
npm run preview
npx playwright install chromium
npm test
npm run test:update
npm run audit
```

Preview usa http://127.0.0.1:4173. Mantenha-o ativo para Lighthouse. npm run audit produz três medições por página (início/detalhe) e perfil (mobile/desktop), HTML/JSON individuais e audits/summary.json com medianas e ambiente.

Testes usam Chromium com desktop 1440×1000 e mobile 390×844. Baselines visuais ficam em tests/flows.spec.ts-snapshots/. Relatório HTML: playwright-report/index.html. Traces de falha: test-results/. npx playwright show-report abre o relatório. A primeira geração de baselines deve ser revisada visualmente; elas verificam regressões da implementação, não equivalência automática ao Figma.

## Stack

React 19, TypeScript, Vite, TanStack Router/Query, Axios, Tailwind CSS 4, componentes shadcn/ui adaptados com Radix/CVA/Slot, MSW 2.15, Socket.IO Client 4 e binding MSW 0.2, Playwright e Lighthouse. Dependências exatas estão no lockfile. A versão 2 do MSW foi fixada para compatibilidade com o peer dependency do binding.

Assets e fontes são locais; não dependem de URLs temporárias do Figma. As artes têm versões WebP responsivas e originais preservados. Scripts de preparação estão em scripts/; download-assets.mjs usa URLs temporárias apenas para preparar os arquivos, não durante execução.

## Documentação e avaliação

API.md descreve contratos e erros. ARCHITECTURE.md registra precisão, sessão, persistência, cache, idempotência, transporte e desvios visuais. EVALUATION.md registra a autoavaliação e as limitações, apoiada por testes e Lighthouse.

## Publicação

O projeto inclui vercel.json com fallback SPA para refresh e acesso direto às rotas. Build: npm run build. Output: dist. A versão publicada deve manter mocks ativos e disponibilizar mockServiceWorker.js na raiz. Uma URL só deve ser apresentada como publicada após verificação do deployment.
