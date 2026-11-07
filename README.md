# KUNG FU DA ILHA — times, rivais e salas online

Beat 'em up 2D de kung fu para celular (HTML + CSS + JS). Briga generalizada entre torcidas de 23 clubes brasileiros e seus rivais, com trilha sonora oriental + percussão de samba. Dá para jogar sozinho ou em **salas de até 6 pessoas** (código de 4 letras), com **placar geral por time**.

Tudo (arte, música, efeitos) é gerado por código. Não há imagens nem arquivos de áudio.

## Rodar no seu computador
```
npm install
npm start
```
Abra http://localhost:3000. Para jogar com colegas na mesma rede Wi-Fi, descubra o IP do computador (ex.: 192.168.0.15) e eles abrem `http://192.168.0.15:3000` no celular.

## Colocar na internet (para a turma toda)
O servidor serve o jogo **e** as salas no mesmo endereço, então basta um serviço Node:

1. Crie um repositório no GitHub com esta pasta (o `.gitignore` já ignora `node_modules`).
2. No Render (render.com) → New → Web Service → escolha o repositório.
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plano: Free
3. Quando ficar pronto, o Render dá um endereço `https://seu-jogo.onrender.com`. Mande esse link para a turma.

Observações do plano gratuito:
- O servidor "dorme" depois de uns 15 min sem acesso e leva ~30 s para acordar. Abra o link alguns minutos antes da aula.
- O endereço `/health` responde "ok" (serve para um monitor gratuito, como o UptimeRobot, manter o servidor acordado).
- O placar geral fica na memória e em `board.json`. No plano gratuito o disco é apagado a cada reinício, então o placar zera quando o servidor reinicia.
- Se hospedar a página em outro lugar (GitHub Pages, por exemplo), abra o jogo com `?server=wss://seu-jogo.onrender.com` no final do endereço.

## Como funciona o online
- Uma pessoa cria a sala, escolhe o time e o rival e passa o código. Os colegas entram pelo código (máx. 6).
- O host escolhe a fase e começa. Todos lutam juntos contra o time rival; na fase 3 aparece o Mestre Juiz.
- Quanto mais gente, mais inimigos. Os pontos da sala somam no placar do time escolhido.
- O servidor roda a luta (60 Hz) e manda o estado aos celulares (30 Hz). Os celulares só enviam os toques.

## Estrutura
- `server.js` — serve os arquivos, salas, placar (WebSocket via pacote `ws`)
- `js/data.js` — clubes e rivais, golpes, inimigos, fases e textos (renomeie o jogo em `KF.TITLE`)
- `js/sim.js` — simulação do combate (roda no servidor e no modo solo)
- `js/view.js`, `js/art.js` — desenho dos lutadores, camisas e cenários
- `js/audio.js` — efeitos e trilhas (koto, shakuhachi, taiko, surdo, ganzá)
- `js/input.js` — joystick virtual, botões e teclado
- `js/net.js`, `js/main.js` — conexão, telas, HUD

## Adicionar ou trocar clubes
Em `js/data.js`, edite as linhas `club('id', 'Nome', 'padrão', cores..., ['rivais'])`. Padrões: `stripes`, `solid`, `hoops`, `hoops3`, `halves`, `tricolor`, `sash`. Só cores e padrões são usados, não há escudos.

## Controles
Joystick à esquerda; SOCO (3x = combo), CHUTE, PULO (ataque no ar = voadora) e DRAGÃO (giro que gasta KI). Teclado: setas/WASD, J, K, L, U; P pausa.

## Escolas de luta (culturas)
Definidas em `KF.SCHOOLS` (`js/data.js`): Kung Fu (China), Karatê (Japão), Muay Thai (Tailândia) e Taekwondo (Coreia).
Cada uma muda vida, velocidade, força de soco/chute/voadora, ganho de KI, o golpe especial e o visual (`js/art.js`).
Para criar outra escola, adicione uma linha em `KF.SCHOOLS` e o desenho em `drawFighter`.

## Fases
1 Templo da Ilha · 2 Ponte das Lanternas · 3 Ringue de Bangkok · 4 Dojo-Estádio (chefe).
