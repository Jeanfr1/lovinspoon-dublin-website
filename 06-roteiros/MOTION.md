# Motion - amor à primeira mordida, almoço em camadas

## Hero - entrada breve
0.00-0.90 s: fotografia acomoda escala de 1.025 para 1.00. 0.20-1.10 s: títulos entram 16 px, sem esconder o conteúdo de um usuário sem JS. 0.35-1.65 s: personagens brancos se desenham por stroke-dashoffset; notas aparecem de forma discreta. Sem loop infinito e sem áudio.

## Encerramento - montagem do sanduíche
A seção do modelo 3 é o palco principal da animação de comida. Quatro PNG transparentes independentes representam toast superior, folhas/tomate, bacon/queijo e toast inferior. Cada arquivo tem posição e deslocamento próprios, sem cortar ingredientes. A composição completa também está incluída como referência estática.

Um parâmetro de progresso vai de 0 (aberto) a 1 (montado). O scroll da seção alimenta esse parâmetro; o controle Sandwich layers permite examinar manualmente o gesto, e Open the layers / Bring it together escolhem os extremos. Não prender o scroll e não usar pinning para alongar a página.

O movimento de cada grupo é documentado em camadas.json. Topo desce, salada e recheio convergem, base permanece. A foto e o título continuam visíveis. O gesto sugere montagem sem apresentar uma receita de venda confirmada.

## Controles
Replay opening reinicia apenas a entrada do hero. Pause motion pausa animações CSS e a atualização por scroll da seção. O slider continua disponível para exploração manual. Sem JS, o asset completo e o conteúdo continuam visíveis; controles são ocultos.

## Movimento reduzido
Com prefers-reduced-motion, não desenhar os personagens nem executar o zoom; exibir imediatamente foto, títulos e marca. A seção mostra as camadas em posição estática, com slider desativado. O usuário pode consultar a composição sem movimento.

## Mobile
Sem parallax da fotografia. Reduzir deslocamentos das camadas, manter botões de 44 px e o texto fora das superfícies claras da comida. Não adicionar blur animado pesado. SVG dos personagens é decorativo, aria-hidden.

## Executável
08-estudo/lovinspoon.js controla entrada, pausa, navegação, scroll e slider. CSS contém keyframes e posições de camada. timeline.json mantém timings e camadas.json mantém geometria. Storyboard e vídeo são demonstrações de composição; somente uma captura real de navegador deve ser chamada de gravação do site.
