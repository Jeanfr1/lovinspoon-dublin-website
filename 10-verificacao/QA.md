# QA da combinação 02 + 03

## Concluído
- Hero e breakfast do modelo 2 preservados; última seção substituída por Lunch comes together do modelo 3.
- Fachada mantida como postcard dentro da última seção, sem nova seção de visita full bleed.
- Logo existente reconstruída em PNG RGBA transparente.
- Hero e breakfast sem lettering embutido; títulos e botões são HTML vivo.
- Quatro cutouts transparentes independentes para montagem do sanduíche; composição estática completa incluída.
- Fotografias públicas do local preservadas byte a byte, com proveniência.
- Fontes locais com licenças incluídas.
- Inglês em toda a interface do estudo; português nos documentos de produção.
- Links internos/âncoras, arquivos CSS, JSON e PNGs verificados.
- Sintaxe JavaScript verificada.
- Contratos de controles testados em DOM simulado: início, pause/replay, slider, extremos aberto/montado, progresso de scroll, menu, Escape/foco, fallback sem IntersectionObserver e reduced motion.
- Guia PDF de oito páginas renderizado e revisado.
- Arquivo ZIP validado por leitura e comparação SHA256.

## Limite de revisão
O navegador de teste não iniciou neste ambiente. A revisão de geometria CSS, crops, contraste em diferentes dispositivos e Safari/iOS não foi concluída. Os testes de DOM simulado não substituem essa revisão. Pranchas, storyboard e vídeo são composições ilustrativas, não screenshots ou gravações do navegador.

## Antes de publicar
1. Abrir o estudo em 390, 768 e 1440 px e conferir ausência de scroll horizontal, título legível e logo inteira.
2. Conferir fundo fotográfico e recorte do sanduíche em desktop/mobile.
3. Abrir Breakfast favourites e conferir que a seção cresce corretamente.
4. Conferir montagem das quatro peças por scroll e slider; pausa, replay e reduced motion.
5. Testar teclado, foco visível e fechamento da navegação por Escape.
6. Conferir rota e postcard. Solicitar asset oficial/autorização da foto do local.
7. Confirmar disponibilidade das opções de breakfast, sanduíches reais, preços e horários com a empresa antes de adicionar dados novos. O estudo não publica preços atuais, horários ou telefone contraditório.

## Reproduzir checks
`python3 10-verificacao/validar-arquivos.py`

`node --check 08-estudo/lovinspoon.js`

`node 10-verificacao/testar-controles.cjs`

O estudo não depende de build. Esses scripts usam Python/Node padrão.
