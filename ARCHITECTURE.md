# Kurio — arquitetura e decisões

## Fluxo completo

React/TypeScript → TanStack Router → TanStack Query → Axios → MSW REST handlers → banco simulado persistente → resposta tipada. Eventos seguem banco simulado → binding MSW de WebSocket → socket.io-client → invalidação de queries → nova leitura REST.

Os componentes não importam fixtures nem o banco de mocks. O cliente HTTP não contém respostas fictícias. O ponto de entrada ativa os mocks antes de montar as rotas. VITE_ENABLE_MOCKS=false desativa a simulação para integrar um backend que implemente os mesmos contratos.

## Precisão e transações

ETH trafega como string decimal; cálculos usam BigInt em wei (18 casas). Desconto de 10% arredonda para baixo em wei. A taxa padrão é 0.016 ETH. Quantidades são inteiras. A cotação contém itens, preços, versões, subtotal, desconto, taxa, total e um fingerprint determinístico.

A tela de pagamento consulta a cotação antes da revisão e outra vez antes do envio. Se o fingerprint divergir, a revisão é fechada e uma nova confirmação é exigida. O handler também compara o fingerprint para eliminar a corrida entre revisão e envio.

Cada tentativa tem UUID de idempotência e payload salvo em sessionStorage, separado por usuário. A API devolve o mesmo pedido ao repetir chave e payload, ou HTTP 409 quando a chave é reutilizada com outro conteúdo. Após uma falha de conexão, recuperar usa a tentativa original, inclusive após refresh.

Pedidos seguem pending → confirmed/declined. Estados terminais nunca voltam a pending. O banco guarda settleAt para recuperar o estado mesmo após refresh; o tick da simulação e as leituras REST reconciliam pedidos vencidos. Recibos usam exclusivamente snapshots do pedido. Confirmação remove apenas as quantidades compradas; recusa preserva o carrinho.

## Sessão, privacidade e persistência

Dois usuários fictícios iniciam o cenário. As senhas persistidas são hashes SHA-256 com salt, nunca senhas em claro. Isso é uma simulação local, não uma arquitetura de autenticação de produção. A senha de demonstração publicada no README é intencionalmente fictícia.

Sessões duram 30 minutos e são revalidadas na navegação privada, periodicamente e nas operações da API. Token e banco simulado estão em localStorage; tentativa interrompida fica em sessionStorage. Logout limpa cache privado e desmonta o socket da sessão. Queries privadas incluem a identidade do usuário. Pedidos de outro usuário retornam 403.

Visitantes têm carrinho próprio. Login mescla itens por NFT/edição, respeitando estoque, e transfere o cupom quando aplicável. Logout não transfere os itens da conta ao visitante.

## Cache e concorrência

Queries têm staleTime de 20 segundos; refetch ao focar a janela e depois de eventos/reconexão. GETs transitórios têm uma tentativa adicional. Erros 4xx não são repetidos. Mutations não fazem retry automático; pedidos usam recuperação explícita por idempotência.

Chaves do catálogo incluem a serialização dos filtros na URL. Query functions de leitura recebem AbortSignal para cancelar respostas obsoletas. Mudanças de filtro reiniciam a página. Busca, coleção, rede, preço, ordenação, aba e página sobrevivem ao refresh e histórico.

Favoritos usam atualização otimista com snapshot anterior e rollback em falha; a mutation invalida a query após concluir. Carrinho/cupom/cotação/pedidos são invalidados após alterações relevantes.

## Socket.IO e limites do transporte simulado

socket.io-client usa WebSocket, namespace padrão, path /socket.io/. MSW 2.15 normaliza esse prefixo no matching; o handler é ws.link('wss://kurio.mock/'). @mswjs/socket.io-binding 0.2 traduz o protocolo Engine.IO/Socket.IO. O cliente é importado depois de iniciar o MSW para não capturar o construtor WebSocket nativo antes da interceptação.

Eventos nft.updated e order.updated carregam id, resourceId, version e, para pedidos, userId. O cliente descarta versões antigas/duplicadas e eventos de outro usuário. A simulação filtra broadcasts privados por subscription da sessão. Uma reconexão revalida recursos ativos na API. Cleanup remove todos os listeners e encerra a conexão. Heartbeat simulado mantém o transporte ativo.

O controle de avaliação envia REST para /api/demo/event. O handler altera o banco e emite pelo binding; não chama setters de React nem escreve no Query cache. A aplicação só recebe a mudança pelo socket e consulta a API.

Limites: simulação local por navegador; não sincroniza diferentes dispositivos ou abas. Não há servidor Socket.IO externo, polling de Engine.IO, anexos binários, namespaces adicionais ou carteiras reais. O indicador de conexão e os testes de eventos verificam o transporte interceptado.

## Design e acessibilidade

Referência: arquivo original Frontend Challenge, Ff0SksUi7UFtPWUO8kyNtw. Foi criada uma cópia de trabalho nos rascunhos para permitir leitura pelo MCP, sem alterar o original. Contextos exportados e o manifesto auxiliar serviram à implementação e foram retirados da entrega após concluir a importação. Os assets locais utilizados pelo site permanecem em public/assets/.

Tokens preservados: Ink #140D0A, Surface Card #241612, Foreground #F5F1EB, Primary #D28A4C, Text Accent #E89B55, Text Secondary #CFB28C. Fonte Roboto Mono distribuída localmente por @fontsource. As quatro artes originais do Figma são preservadas e têm variantes WebP responsivas, geradas com Sharp; não há arte substituta gerada por IA.

Button e Dialog seguem os padrões shadcn/ui, com CVA, Slot e Radix adaptados aos tokens. Diálogos têm focus trap, Escape, nome acessível e restauração explícita de foco. Campos têm labels e nomes acessíveis estáveis. Erros e mutations usam alert/status; foco é visível. Shimmer respeita prefers-reduced-motion.

Diferenças deliberadas: dados de catálogo adicionais para filtros/paginação; formulários e estados de erro/loading não desenhados; controles explícitos para simular conexão/recusa; avisos de ações auxiliares fora do escopo; confirmação por revisão acessível. Cartão do catálogo mantém metadados legíveis onde o frame omite títulos. O Figma MCP atingiu o limite do plano ao ler alguns frames; carteiras e adaptações complementares usaram a estrutura e as telas relacionadas já extraídas. Não é alegada equivalência pixel a pixel em todas as telas.

Editorial, redes sociais, newsletter e explorador não simulam sucesso funcional. Os links abrem avisos coerentes quando não há integração. Contatos do rodapé são conteúdo ilustrativo do layout, não canais de suporte reais.

## Execução e evidência

Playwright usa um contexto novo por teste, MSW real no navegador, desktop 1440 e mobile 390. Há baselines de início, detalhe, carrinho e pagamento; HTML report e traces ficam em playwright-report/ e test-results/. Capturas adicionais e auditorias medem também tablet 768.

Lighthouse roda o build otimizado em preview, com imagens, fontes e todas as funcionalidades da demonstração. scripts/audit.mjs versiona as condições, executa três medições para cada combinação de página/perfil e salva HTML/JSON, ambiente e medianas. Resultados não devem ser extrapolados para um backend/blockchain de produção.

## Revisão final — carregamento e identidade social

As páginas secundárias usam lazyRouteComponent do TanStack Router. O bootstrap inicia o download apenas da rota acessada em paralelo com a aplicação e o MSW, evitando uma espera adicional em acessos diretos. A montagem continua aguardando a ativação do MSW, preservando a interceptação dos primeiros requests. Fontes 400/700 recebem preload no HTML com o mesmo URL final do CSS.

Google e Facebook usam os SVGs originais exportados do Figma. O símbolo Google mantém os sete fragmentos e suas posições no slot de 20 px; o Facebook usa o asset integral de 20 px. São decorativos, pois o botão já identifica o provedor. Os mesmos componentes atendem login/cadastro em desktop/mobile. OAuth permanece fora do escopo e o aviso explica isso, com retorno de foco ao botão acionado.

## Correções R01–R18 e validação do build

As regras de disponibilidade são compartilhadas por detalhe, carrinho, merge e mocks. O banco mantém estoque global e por edição; a migração reconstrói disponibilidade para bases antigas a partir dos recibos confirmados. A liquidação agrega a demanda por NFT e edição antes de confirmar, mantendo a operação síncrona e os estados terminais. Não são criadas reservas reais: uma disputa por estoque pode recusar o segundo pedido pendente.

Erros anteriores à criação, identificados por QUOTE_CHANGED/QUOTE_INVALID ou validação 422, liberam nova revisão. Timeout/transportes/5xx preservam a tentativa idempotente. O rascunho do coletor fica em sessionStorage por usuário, inclui o campo secundário e é removido após confirmação. A autorização/conexão da carteira não é restaurada automaticamente ao reautenticar.

useFormValidation associa os erros retornados pela API aos campos e foca o primeiro inválido. Tabs usam foco móvel, setas/Home/End e IDs que relacionam os painéis. Os três destaques e as três páginas de relacionados têm botões reais e estado ativo; não há autoplay. Os pontos usam o SVG original em slots de 8 px, mantendo a geometria de 40×8 do asset; os botões têm áreas de 24×24. Os dois destaques adicionais reutilizam artes e tokens do arquivo, com textos complementares; não são apresentados como frames adicionais fornecidos pelo Figma.

prerender.tsx é uma entrada exclusiva do build. Ela usa React/TanStack Router/Query para gerar 37 páginas públicas e dehidratar apenas consultas nft/nfts. Não importa o banco persistente do navegador, nem coloca contas, senhas, carteiras privadas, favoritos, sessões ou recibos no HTML. O runtime hidrata somente a rota pública padrão correspondente; usuários autenticados, buscas/filtros e cenários diferentes do padrão continuam dinâmicos. Os cenários usam a flag de configuração kurio.scenario, atualizada ao persistir os mocks; ela não transporta respostas de negócio para componentes.

O bootstrap cede um paint (dois requestAnimationFrame) antes dos imports pesados em páginas pré-renderizadas. Não há atraso temporizado, detecção de Lighthouse nem remoção de funcionalidades. Fontes são declaradas no CSS inicial e as imagens acima da dobra usam variantes responsivas. O HTML inicial fica inert/aria-busy até a ativação de MSW e React; a interação não envia requests antes da interceptação. REST/Socket.IO reconciliam o snapshot público com a base persistida. Mocks desativados desabilitam a geração desses snapshots.

Vercel usa cleanUrls para os documentos públicos e fallback /spa para recursos desconhecidos e telas privadas. A configuração de testes de produção roda a suíte no preview ou em PLAYWRIGHT_BASE_URL, valida HTML/privacidade/hidratação e espera o indicador público de conexão antes de controles programáticos de rede. Os testes de zoom usam viewport/DPR equivalentes a 200% no desktop e ampliação visual 2x no mobile, em contextos isolados.
