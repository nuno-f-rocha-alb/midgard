# Midgard

Dashboard de new tab para o homelab — pesquisa, sites mais visitados e estado
de toda a rede (máquinas, containers, serviços) num só sítio.

```
extensão (newtab) ──iframe──▶ frontend (React) ──WS──▶ backend (FastAPI)
                                                          │
        beszel · portainer · pi-hole · proxmox · emby · crafty
        qbittorrent · scrutiny · speedtest-tracker · bifrost agent
```

O backend agrega APIs que já existem na rede; as credenciais ficam todas no
`.env` do container, nunca chegam ao browser. Conectores sem config ficam
desativados automaticamente.

## Deploy via Portainer (recomendado)

Padrão GitOps, igual ao bifrost: push para `main` → GitHub Actions builda
`ghcr.io/<owner>/midgard:latest` → Portainer corre a imagem → watchtower
atualiza nos pushes seguintes.

1. Push do repo para o GitHub (o workflow em
   [`.github/workflows/build-push.yml`](.github/workflows/build-push.yml) trata do build).
2. Tornar o package `midgard` público (Settings do package → Change visibility),
   ou fazer `docker login ghcr.io` no dockeralho se o quiseres privado.
3. Portainer → Stacks → Add stack → Web editor → colar
   [`docker-compose.portainer.yml`](docker-compose.portainer.yml) (substituir `OWNER`).
4. Preencher os tokens na secção **Environment variables** da stack e Deploy.

O `config/services.yaml` vai dentro da imagem — mudar tiles = commit + push.

## Deploy manual (alternativa, sem GitHub)

```bash
git clone <repo> && cd dashboard
cp .env.example .env
$EDITOR .env                 # preencher tokens (ver abaixo)
$EDITOR config/services.yaml # ajustar hosts/portas dos tiles
docker compose up -d --build # fica em :8484
```

## Tokens necessários (uma vez)

| Conector | Onde arranjar |
|---|---|
| Beszel | a conta de login do beszel (email + password) |
| Portainer | Settings → API → Add access token |
| Pi-hole | password da web UI (v6) ou app password |
| Proxmox | Datacenter → Permissions → API Tokens (role PVEAuditor chega), um por nó |
| Emby | Dashboard → Advanced → API Keys |
| Crafty | perfil do user → API Keys |
| qBittorrent | user/pass da web UI |
| Scrutiny | sem auth, só o URL |
| Speedtest Tracker | Settings → API Tokens |
| Bifrost | o `AGENT_KEY` do `.env` do agent no VPS |

## Extensão (new tab)

A pasta [`extension/`](extension/) tem uma extensão MV3 que:
1. substitui a new tab por um iframe do dashboard;
2. injeta os "mais visitados" do browser (API `topSites`, só acessível a extensões).

**Brave / Chrome / Edge:** `brave://extensions` → Developer mode → *Load unpacked* → pasta `extension/`.
**Firefox:** `about:debugging` → This Firefox → *Load Temporary Add-on* → `manifest.json` (para instalar permanente é preciso assinar via AMO).

Nas opções da extensão define o URL do dashboard (default `http://dockeralho:8484`).
Sem extensão, o dashboard funciona como página normal — só não tem os mais visitados.

## Dev local

```bash
# backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8484

# frontend (proxy /api → :8484)
cd frontend && npm install && npm run dev
```

## Pesquisa

Enter pesquisa no Google; URLs abrem direto. Bangs: `!yt` YouTube, `!gh` GitHub,
`!w` Wikipédia, `!amz` Amazon.es, `!cm` Cardmarket — editáveis em
[`SearchBar.jsx`](frontend/src/components/SearchBar.jsx).

## Notas

- O conector do beszel mapeia as chaves curtas do `info` (`cpu`/`mp`/`dp`/`u`);
  se uma versão nova do beszel mudar o formato, é ali que se ajusta
  ([`beszel.py`](backend/app/connectors/beszel.py)).
- Health checks consideram "up" qualquer resposta HTTP < 500 (401/403 = vivo,
  só pede login).
- O dashboard não tem auth própria — assume LAN/VPN, como o bifrost. Não expor
  publicamente sem proxy autenticado à frente.
