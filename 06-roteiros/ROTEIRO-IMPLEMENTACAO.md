# Roteiro de implementação

1. Abrir catalogo.html e ver a combinação final modelo 2 + encerramento do modelo 3.
2. Ler DIRECAO.md, LOGO.md e paleta.json. Preservar preto/marfim, madeira e acento mustard.
3. Usar a logo PNG transparente, com variante branca via CSS em fundos escuros. Não usar as pranchas com textos achatados como fundos do site.
4. Integrar o hero fotográfico sem texto e os personagens SVG em camadas separadas.
5. Integrar breakfast.webp como fundo da seção 2. O menu em papel usa textos vivos e details/summary acessível.
6. Montar a última seção do modelo 3 usando os quatro PNG transparentes e as posições CSS definidas. Aplicar o movimento via progresso de scroll e controles entregues.
7. Posicionar a foto real da fachada como postcard nessa mesma seção; adicionar endereço e rota.
8. Aplicar CONTEUDO-EN.md. Todas as informações de visitantes permanecem em inglês.
9. Confirmar menu/horários/preços com o dono antes da publicação. Não publicar números de avaliações, telefone contraditório ou garantias de alergênicos.
10. Revisar 390/768/1440 px, teclado, reduced motion, contrastes e legibilidade da logo. Scripts em 10-verificacao verificam arquivos e contratos de controles.
11. Publicar no fluxo escolhido pelo cliente. Nenhum site foi publicado nesta entrega.

## Abrir e editar
Abrir 08-estudo/index.html diretamente no navegador. Se file:// restringir assets, rodar `python3 -m http.server 8080` na raiz do kit e visitar http://localhost:8080/08-estudo/. Nenhum build ou pacote externo é necessário para o estudo.

Editar HTML para textos/estrutura, CSS para estilo e JS para interação. O JSON documenta integração e não exige fetch no browser. Fontes e imagens são locais.
