# Mapitas

Guia pessoal de ônibus **Cedral → São José do Rio Preto (Qualisol)** e volta: Expresso Itamarati + linha urbana 110 (RioPretrans).
É um PWA que funciona offline. Não existe API pública das empresas, então os dados ficam em `public/data/*.json`.

Endereço: **https://lpassos40.github.io/mapitas/**

## O que tem (Fase 1)

- **Mapa**: sua posição, os pontos, o Itamarati em vermelho, a 110 em azul e as caminhadas em cinza tracejado. O cartão de baixo mostra o próximo passo com contagem regressiva.
- **Planejar**:
  - Ida: você informa a hora de chegada e o app mostra a opção *No limite* (última combinação que chega a tempo) e a *Com folga* (chega com pelo menos a folga mínima de antecedência).
  - Volta: você informa a hora de saída da fábrica e o app calcula a 110 e o Itamarati.
  - Ao tocar numa opção, o trajeto aparece no mapa.
- **Horários**: as três tabelas, com o tipo de dia automático (feriado = domingo, lista em `holidays.json`). Os horários que já passaram ficam riscados e o próximo fica destacado.
- **Ajustes**: tempos, horários, coordenadas dos pontos e backup (exportar, importar e restaurar padrão).

Pontos e traçados marcados como **aproximados** vieram de geocodificação automática. Corrija-os pelo app.

## Desenvolvimento

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes do planejador (Vitest)
npm run build      # gera dist/ (base /mapitas/)
npm run preview    # serve o build, com o service worker
```

### Dados

| Arquivo | Conteúdo |
| --- | --- |
| `stops.json` | pontos: id, nome, lat, lng, tipo (embarque/desembarque/referencia), precisao (aproximado/confirmado), observacao |
| `lines.json` | linhas: id, nome, operadora, cor e sentidos, cada sentido com horários por tipo de dia (`u`, `s`, `d`) e paradas em ordem |
| `shapes.json` | traçado por linha e sentido, com precisão |
| `params.json` | tempos em minutos |
| `holidays.json` | feriados: `MM-DD`, `AAAA-MM-DD` ou móveis (`pascoa-2`, `pascoa+60`) |

Scripts que só rodam no desenvolvimento e respeitam as políticas de uso (1 req/s, User-Agent identificado):

```bash
npm run geocode    # Nominatim → stops.json (sobrescreve; tudo "aproximado")
npm run shapes     # OSRM carro (routing.openstreetmap.de) → shapes.json
```

### Levar as correções do celular para o repositório

1. No app, vá em **Ajustes → Exportar JSON**. O arquivo se chama `mapitas-dados-AAAA-MM-DD.json`.
2. Passe o arquivo para o computador e rode:
   ```bash
   npm run apply-export -- caminho/mapitas-dados-AAAA-MM-DD.json
   ```
3. Confira com `git diff`, depois faça o commit e o push. O deploy roda sozinho.
4. No celular, quando aparecer o aviso "Os dados do repositório mudaram", toque em **Usar os do repositório**.

## Deploy no GitHub Pages

O workflow `.github/workflows/deploy.yml` roda os testes, faz o build e publica a cada push na `main`.

Configuração, feita uma vez só:

1. Crie o repositório `lpassos40/mapitas` no GitHub e envie o código:
   ```bash
   git remote add origin https://github.com/lpassos40/mapitas.git
   git push -u origin main
   ```
2. No GitHub, abra **Settings → Pages → Build and deployment → Source** e escolha **GitHub Actions**.
3. Acompanhe a publicação na aba **Actions**. Ao terminar, o app fica em https://lpassos40.github.io/mapitas/.

> O GitHub Pages gratuito exige repositório **público**. Isso deixa os horários e o endereço da Qualisol visíveis para qualquer pessoa.

Se o nome do repositório mudar, ajuste o `base` em `vite.config.ts`.

## Adicionar à tela inicial

**Android (Chrome)**: abra o endereço do app, toque no menu **⋮** e depois em **Adicionar à tela inicial** (ou **Instalar app**). Confirme.

**iPhone (Safari)**: abra o endereço do app no Safari, toque em **Compartilhar** (quadrado com seta) e depois em **Adicionar à Tela de Início**.

Abra o app uma vez com internet para ele guardar tudo para uso offline. Os mapas offline são só as áreas que você já viu.
Permita o acesso à **localização** quando o app pedir.

## Créditos e políticas

- Mapa: © colaboradores do [OpenStreetMap](https://www.openstreetmap.org/copyright). O app segue a [política de tiles](https://operations.osmfoundation.org/policies/tiles/): guarda só os tiles já vistos (até 1.500, por 30 dias) e não baixa áreas antecipadamente.
- Geocodificação: [Nominatim](https://operations.osmfoundation.org/policies/nominatim/), só nos scripts de desenvolvimento.
- Rotas: [OSRM](https://project-osrm.org/) nos servidores da FOSSGIS (`routing.openstreetmap.de`).
