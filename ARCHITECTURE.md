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

Referência: arquivo original Frontend Challenge, Ff0SksUi7UFtPWUO8kyNtw. Foi criada uma cópia de trabalho nos rascunhos para permitir leitura pelo MCP, sem alterar o original. Contextos e manifesto de assets estão em design-reference/.

Tokens preservados: Ink #140D0A, Surface Card #241612, Foreground #F5F1EB, Primary #D28A4C, Text Accent #E89B55, Text Secondary #CFB28C. Fonte Roboto Mono distribuída localmente por @fontsource. As quatro artes originais do Figma são preservadas e têm variantes WebP responsivas, geradas com Sharp; não há arte substituta gerada por IA.

Button e Dialog seguem os padrões shadcn/ui, com CVA, Slot e Radix adaptados aos tokens. Diálogos têm focus trap, Escape, nome acessível e restauração explícita de foco. Campos têm labels e nomes acessíveis estáveis. Erros e mutations usam alert/status; foco é visível. Shimmer respeita prefers-reduced-motion.

Diferenças deliberadas: dados de catálogo adicionais para filtros/paginação; formulários e estados de erro/loading não desenhados; controles explícitos para simular conexão/recusa; avisos de ações auxiliares fora do escopo; confirmação por revisão acessível. Cartão do catálogo mantém metadados legíveis onde o frame omite títulos. O Figma MCP atingiu o limite do plano ao ler alguns frames; carteiras e adaptações complementares usaram a estrutura e as telas relacionadas já extraídas. Não é alegada equivalência pixel a pixel em todas as telas.

Editorial, redes sociais, newsletter e explorador não simulam sucesso funcional. Os links abrem avisos coerentes quando não há integração. Contatos do rodapé são conteúdo ilustrativo do layout, não canais de suporte reais.

## Execução e evidência

Playwright usa um contexto novo por teste, MSW real no navegador, desktop 1440 e mobile 390. Há baselines de início, detalhe, carrinho e pagamento; HTML report e traces ficam em playwright-report/ e test-results/. Capturas adicionais e auditorias medem também tablet 768.

Lighthouse roda o build otimizado em preview, com imagens, fontes e todas as funcionalidades da demonstração. scripts/audit.mjs versiona as condições, executa três medições para cada combinação de página/perfil e salva HTML/JSON, ambiente e medianas. Resultados não devem ser extrapolados para um backend/blockchain de produção.
