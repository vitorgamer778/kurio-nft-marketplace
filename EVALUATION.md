# Autoavaliação pelos critérios do desafio

Estimativa técnica: **88/100**. Não é nota oficial nem certificação de fidelidade pixel a pixel. O objetivo deste documento é separar o que foi verificado das limitações restantes.

| Critério | Estimativa | Evidência e limite |
|---|---:|---|
| Fidelidade visual e responsividade | 16/20 | Tokens, fonte e artes reais do Figma; início, detalhe, carrinho, pagamento, conta e recibo responsivos. Capturas em 390/768/1440. Algumas composições e estados complementares foram adaptados; leitura MCP de alguns frames foi limitada pelo plano. |
| Fluxos e experiência | 18/20 | Descoberta, favoritos, carrinho, cupom, cadastro, sessão, perfil, avatar, senha, carteiras, revisão, compra e recibo. Pagamento recusado e timeout preservam recuperação. UX mobile de checkout tem mais conteúdo rolável que o frame de seleção de carteira. |
| Integração e estado | 14/15 | Router/Query/Axios efetivos, URL persistente, contratos tipados, cancelamento de GETs, cache por usuário e rollback otimista. Latência variável está disponível; cobertura automatizada de todas as permutações concorrentes não é alegada. |
| Tempo real | 9/10 | Cliente Socket.IO real com MSW/binding, eventos versionados, duplicatas/antigos, reconexão e pedido pendente recuperado com relógio controlado. Transporte limitado ao namespace padrão e WebSocket local. |
| Mocking | 9/10 | Rede interceptada, duas contas, 36 NFTs, cenários de falha, reset e persistência consistente. Simulação não sincroniza abas/dispositivos. |
| Testes | 9/10 | **34 testes passaram**: 17 cenários em desktop e mobile, incluindo tablet, fluxo completo, duplo clique, isolamento de recibo e regressão visual de quatro telas. Baselines foram geradas no Windows; outros SOs podem exigir revisão de rasterização. |
| Acessibilidade | 5/5 | Lighthouse 100 nas quatro combinações auditadas; teclado, foco de diálogos, validação, feedback e reduced motion. Isto não substitui uma auditoria WCAG integral com usuários. |
| Performance | 3/5 | Desktop passou; mobile ficou abaixo de 90. Métricas e causas descritas abaixo, sem remover funcionalidades da auditoria. |
| Arquitetura e documentação | 5/5 | Setup, lockfile, contratos REST/eventos, política de sessão/cache/carrinho, precisão em wei, idempotência, assets locais, testes e auditorias documentados. |
| **Total estimado** | **88/100** | A validação visual final e a avaliação oficial pertencem ao avaliador. |

## Verificações executadas

- npm run lint: passou.
- npm run build: passou, incluindo TypeScript.
- npm test -- --workers=1: **34 passed (2.8m)**, Chromium, desktop 1440×1000 e mobile 390×844; testes adicionais percorrem as telas em 768×1024.
- Regressão visual: início, detalhe, carrinho e pagamento, nos dois perfis.
- Lighthouse: 12 medições no build otimizado, três por página/perfil.

A execução anterior com dois workers teve uma falha de infraestrutura: ERR_NETWORK_CHANGED ao carregar módulos locais. O trace identificou a causa; a execução final sequencial passou integralmente. Não foi adicionado retry para ocultar a falha.

## Lighthouse — medianas de três execuções

| Página / perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| Início / mobile | 84 | 100 | 100 | 100 | 4.041 s | 0 | 67 ms |
| Detalhe / mobile | 88 | 100 | 100 | 100 | 3.668 s | 0.000850 | 40 ms |
| Início / desktop | 98 | 100 | 100 | 100 | 1.040 s | 0.002809 | 0 ms |
| Detalhe / desktop | 99 | 100 | 100 | 100 | 0.877 s | 0.000735 | 0 ms |

Metas do README: Performance ≥90, Accessibility ≥95, Best Practices ≥95, SEO ≥90. As metas de performance mobile ainda não foram atingidas; as demais foram.

Causa principal: o primeiro carregamento precisa inicializar a camada MSW/Service Worker e o runtime da aplicação antes de consultar dados. O bundle de mocks tem cerca de 166 KB gzip e o da aplicação cerca de 163 KB gzip. Sob a limitação mobile do Lighthouse, esse custo e a descoberta de imagens do catálogo aumentam o LCP. TBT e CLS permanecem baixos.

Otimizações aplicadas: bootstrap concorrente da aplicação e dos mocks; WebP responsivo em 300/600/900 px preservando as artes; prioridade das imagens iniciais; fontes locais; dimensões reservadas; CSS Tailwind restrito ao código de execução; reduced motion. Uma próxima melhoria é dividir as rotas da conta/checkout e reduzir o caminho crítico de inicialização dos mocks, mantendo o comportamento da demonstração.

Os relatórios individuais HTML/JSON e audits/summary.json registram versões, hardware e condições. Ambiente: Windows, Node 24.19.0, Lighthouse 13.5.0, Playwright 1.64.1; build Vite otimizado em preview local, mocks padrão, Chromium headless. Auditorias não foram executadas com cards removidos, fontes substituídas ou caminhos exclusivos para Lighthouse.

## Limitações explícitas

Demonstração pública: https://kurio-nft-marketplace-kappa.vercel.app. O build da Vercel corresponde aos mesmos bundles verificados localmente. O smoke test remoto foi executado sem login da Vercel, incluindo compra simulada e alteração de preço pelo socket. O recibo é acessível após refresh, e os itens comprados saem do carrinho.

- Não há blockchain, gateway de pagamento, OAuth social, envio de newsletter ou explorador real; isso é coerente com o escopo do desafio.
- Não é alegada equivalência pixel a pixel de todos os frames.
- Persistência da simulação é por navegador. Carteiras e recibos são fictícios.
- A nota estimada considera as evidências acima; não garante aprovação no processo seletivo.
