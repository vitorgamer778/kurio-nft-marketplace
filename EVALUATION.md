# Autoavaliação pelos critérios do desafio

Estimativa técnica: **92/100**, apoiada pelas verificações abaixo. Não é nota oficial nem certificação pixel a pixel. A avaliação anterior antecedia a descoberta dos 18 problemas; esta versão considera as correções e os novos testes.

| Critério | Estimativa | Evidência e limite |
|---|---:|---|
| Fidelidade visual e responsividade | 17/20 | Fonte, tokens, artes e ícones Google/Facebook originais; capturas 390/768/1440 e baselines desktop/mobile. Algumas composições são adaptadas; acesso MCP a alguns frames foi limitado pelo plano. |
| Fluxos e experiência | 18/20 | Compra, recusa, timeout, cotação alterada, expiração, favoritos, perfil, carteiras e estoque por edição com recuperação testada. Checkout mobile tem mais conteúdo rolável que o frame. |
| Integração e estado | 14/15 | Router/Query/Axios, URL com precisão em wei, cache por usuário, draft isolado, idempotência e estoque global/por edição. Não se alega cobertura de toda permutação concorrente possível. |
| Tempo real | 9/10 | Socket.IO com binding MSW, eventos versionados, duplicatas/antigos, reconexão e reconciliação REST. Transporte local da demonstração. |
| Mocking | 9/10 | Duas contas, 36 NFTs, falhas determinísticas, persistência e reset; estoque atômico na liquidação. Sem sincronização entre abas/dispositivos. |
| Testes | 10/10 | **78 testes passaram** no build de produção, sem retries; fluxos originais, regressão de cada ponto aplicável, zoom e hidratação. Baselines Windows verificam regressão da implementação. |
| Acessibilidade | 5/5 | Lighthouse, navegação por teclado, abas, foco, mensagens por campo e reduced motion. Não substitui auditoria WCAG integral com usuários. |
| Performance | 5/5 | Metas de todas as categorias atingidas nas quatro medianas. HTML público inicial não incorpora dados de contas e preserva REST/Socket.IO. |
| Arquitetura e documentação | 5/5 | Setup, lockfile, contratos, política de sessão/cache, estoque e migração, publicação e reprodução documentados. |
| **Total estimado** | **92/100** | Sujeito à avaliação oficial e revisão visual completa dos frames. |

## Verificações

ESLint, TypeScript e build passaram. A suíte Playwright executou 78 testes nos perfis desktop 1440×1000 e mobile 390×844, com passagens por tablet 768×1024. [Matriz das correções](verification/REVIEW-FIXES.md), [JSON Playwright](verification/production-tests.json) e [relatório HTML](verification/playwright-report/index.html).

## Lighthouse — medianas de três execuções

| Página / perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| Início / mobile | 100 | 100 | 100 | 100 | 1.595 s | 0.000000 | 41 ms |
| Início / desktop | 100 | 100 | 100 | 100 | 0.669 s | 0.000000 | 0 ms |
| Detalhe / mobile | 99 | 100 | 100 | 100 | 2.113 s | 0.000000 | 28 ms |
| Detalhe / desktop | 100 | 100 | 100 | 100 | 0.475 s | 0.000000 | 0 ms |

Metas: Performance ≥90, Acessibilidade ≥95, Boas práticas ≥95, SEO ≥90. Todas atingidas nas medianas. São 12 medições no build otimizado local, MSW padrão, Chromium headless e throttling simulado. [Amostras e ambiente](audits/summary.json). Não há ramificação exclusiva para Lighthouse ou remoção de funcionalidades nas auditorias.

O primeiro HTML público vem das mesmas fixtures usadas na API simulada; imagens usam WebP responsivo e fontes locais carregam no CSS inicial. React hidrata após iniciar a interceptação MSW, mantém os controles inativos até essa etapa e reconcilia os dados por REST/Socket.IO. Sessões, pedidos e carrinhos não entram no HTML pré-gerado. URLs filtradas, contas autenticadas e cenários alternativos preservam o fluxo dinâmico e os skeletons.

## Limitações

Demonstração: [Kurio](https://kurio-nft-marketplace-kappa.vercel.app). A confirmação do deployment e os testes remotos ficam em verification/deployment-smoke.json e verification/deployment-tests.json.

- Sem blockchain, gateway, OAuth social, envio de newsletter ou explorador real; simulação conforme o escopo do desafio.
- Persistência por navegador, carteiras e recibos fictícios.
- Sem alegação de fidelidade pixel a pixel de todos os frames; destaques extras usam artes existentes e copy complementar.
- A estimativa não garante aprovação no processo seletivo.
