# Correções e repetição dos testes

Os 18 pontos da revisão anterior foram tratados. O diagnóstico anterior permanece como registro do estado anterior; esta matriz registra a implementação corrigida.

## Resultado verificável

- ESLint e build TypeScript/Vite passaram.
- Playwright de produção: **78/78 passaram**, sem retries, falhas, testes pulados ou flaky; desktop e mobile.
- A suíte contém 36 verificações dos fluxos existentes, 36 regressões da revisão/zoom e seis verificações de HTML público, hidratação e cenários.
- Lighthouse: 12 execuções, três por página e perfil. Todas as metas foram atingidas nas medianas.
- JSON completo: [production-tests.json](production-tests.json). Relatório navegável: [Playwright](playwright-report/index.html).

## Matriz R01–R18

| Ponto | Problema anterior | Correção e comportamento validado |
|---|---|---|
| R01 | Conflito antes de criar pedido | Cotação vencida libera nova revisão; timeout após criação conserva a chave idempotente. |
| R02 | Estoque global negativo | Liquidação agrega todas as linhas e valida disponibilidade antes de descontar qualquer item. |
| R03 | Revenda da edição 1/1 | Estoque por edição é persistido; uma edição única confirmada não pode ser comprada novamente. |
| R04 | Remoção de edições esgotadas | Quantidade zero remove a linha mesmo quando outras edições também estão esgotadas. |
| R05 | Mescla de carrinhos no login | Mescla respeita estoque global e por edição e informa quando precisou ajustar quantidades. |
| R06 | E-mail duplicado com maiúsculas | Cadastro, login e perfil normalizam e-mail; conflito não altera a conta existente. |
| R07 | Rascunho perdido na expiração | Rascunho por usuário na sessão restaura campos após novo login; conexão de carteira exige nova confirmação. |
| R08 | Favoritos em skeleton infinito | Erro da consulta principal aparece com ação de tentar novamente. |
| R09 | Preço na URL e histórico | Inputs acompanham voltar/avançar; URL direta preserva casas decimais e refresh. |
| R10 | Painel demo e cenário incorreto | /?demo=1 abre a opção documentada; seletor reflete o cenário ativo persistido. |
| R11 | Carteira secundária descartada | Campo faz parte do snapshot imutável do pedido. |
| R12 | Erros de formulário sem associação | Mensagens ligadas por aria-describedby, aria-invalid e foco no primeiro campo inválido. |
| R13 | Abas sem teclado completo | Setas, Home e End, foco móvel e relações tab/tabpanel. |
| R14 | Limite de quantidade incorreto | Carrinho e detalhe usam a mesma disponibilidade por edição; 1/10 tem máximo 10. |
| R15 | Performance mobile abaixo da meta | Metas atingidas nas quatro medianas Lighthouse; HTML público inicial, imagens responsivas e fontes locais. |
| R16 | Indicadores decorativos | Três destaques selecionáveis e três páginas de relacionados. Botões têm rótulos e estado ativo. |
| R17 | Contagens de filtros fictícias | Facetas REST derivadas das fixtures, incluindo estoque zero; cenário vazio tem contagem zero. |
| R18 | Contrato e royalties trocados | Conteúdo aparece sob o título correspondente. |

Cada R01–R14 e R16–R18 tem teste com o mesmo identificador em [tests/review.spec.ts](../tests/review.spec.ts), executado nos dois perfis. R15 usa Lighthouse. O zoom adicional verifica navegação e formulário; desktop equivale a viewport reduzido pela metade com DPR 2, e mobile usa escala de página 2 via CDP. A geração do HTML é verificada em [tests/prerender.production.ts](../tests/prerender.production.ts).

## Lighthouse: medianas de três execuções

| Página / perfil | Performance | Acessibilidade | Boas práticas | SEO | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|
| Início / mobile | 100 | 100 | 100 | 100 | 1.595 s | 0.000000 | 41 ms |
| Início / desktop | 100 | 100 | 100 | 100 | 0.669 s | 0.000000 | 0 ms |
| Detalhe / mobile | 99 | 100 | 100 | 100 | 2.113 s | 0.000000 | 28 ms |
| Detalhe / desktop | 100 | 100 | 100 | 100 | 0.475 s | 0.000000 | 0 ms |

Metas do desafio: Performance ≥90, Acessibilidade ≥95, Boas práticas ≥95, SEO ≥90. Ambiente e as 12 amostras estão em [audits/summary.json](../audits/summary.json); HTML/JSON individuais na mesma pasta. Medição no preview otimizado, com MSW padrão e funcionalidades completas.

## Limites da evidência

Os testes de regressão verificam comportamentos e baselines da implementação; não provam identidade pixel a pixel com todos os frames do Figma. Os dois destaques adicionais usam artes existentes e textos complementares, não frames novos fornecidos pelo Figma. A simulação persiste por navegador, sem blockchain, OAuth ou gateway real. O HTML pré-gerado inclui somente catálogo/NFTs públicos; REST e Socket.IO continuam responsáveis pela reconciliação e confirmação das compras.

## Confirmação da publicação

A suíte completa foi repetida na [URL pública](https://kurio-nft-marketplace-kappa.vercel.app): **78/78 passaram**, sem retries ou flaky. [JSON remoto](deployment-tests.json), [HTML remoto](deployment-report/index.html), [11 verificações complementares](deployment-smoke.json), [refresh das rotas e HTML por caminho](deployment-routing.json) e [deployment testado](deployment-source.json). Código funcional: 5362ac0acaa991382f581338195dfafed866dbfd.

A suíte local inicial passou 78/78; depois do ajuste final da área de toque de EXPLORAR, os oito casos locais afetados de teclado, carrossel, zoom e regressão visual passaram, e a suíte completa acima validou a versão final na Vercel. As 12 auditorias Lighthouse foram repetidas com esse ajuste. Nenhum resultado da execução diagnóstica com falhas foi usado como aprovação.

Capturas públicas: [desktop](../screenshots/desktop.png), [tablet](../screenshots/tablet.png), [mobile — destaque 1](../screenshots/mobile.png), [destaque 2](../screenshots/mobile-slide-2.png), [destaque 3](../screenshots/mobile-slide-3.png), [login](../screenshots/login-mobile.png). O carrossel mostra um destaque por vez e permite escolher os três indicadores.
