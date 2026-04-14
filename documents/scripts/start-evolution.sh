#!/usr/bin/env bash
# start-evolution.sh — sobe Evolution Go via docker-compose.
# Uso:
#   ./scripts/start-evolution.sh           # sobe
#   ./scripts/start-evolution.sh stop      # para
#   ./scripts/start-evolution.sh logs      # tail dos logs
#   ./scripts/start-evolution.sh pair      # gera QR code pra parear WhatsApp
#   ./scripts/start-evolution.sh restart   # restart

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/docker"

if [[ -f "$ROOT/.env" ]]; then
  set -a; source <(grep -E '^[A-Z_]+=' "$ROOT/.env" || true); set +a
fi

CMD="${1:-up}"
INST="${EVOLUTION_INSTANCE_NAME:-gestor}"
URL="${EVOLUTION_API_URL:-http://localhost:8080}"
KEY="${EVOLUTION_API_KEY:-change-me-strong-key}"

case "$CMD" in
  up|start|"")
    echo "Subindo Evolution Go + Postgres + Redis..."
    docker compose up -d
    echo ""
    echo "Aguardando Evolution responder..."
    for i in {1..30}; do
      if curl -fsS "$URL/" >/dev/null 2>&1; then
        echo "Evolution rodando em $URL"
        echo ""
        echo "Próximo passo: ./scripts/start-evolution.sh pair"
        exit 0
      fi
      sleep 2
    done
    echo "Evolution não respondeu em 60s. Verifica logs: ./scripts/start-evolution.sh logs"
    exit 1
    ;;

  stop|down)
    echo "Parando containers..."
    docker compose down
    ;;

  restart)
    docker compose restart
    ;;

  logs)
    docker compose logs -f --tail=100 evolution-api
    ;;

  pair)
    echo "Criando/Garantindo instância '$INST'..."
    curl -s -X POST "$URL/instance/create" \
      -H "apikey: $KEY" \
      -H "Content-Type: application/json" \
      -d "{\"instanceName\":\"$INST\",\"qrcode\":true,\"integration\":\"WHATSAPP-BAILEYS\"}" \
      || true
    echo ""
    echo "Pegando QR code..."
    QR=$(curl -fsS -H "apikey: $KEY" "$URL/instance/connect/$INST" | grep -oE '"base64":"[^"]+"' | cut -d'"' -f4)

    if [[ -z "$QR" ]]; then
      echo "Não consegui pegar QR. Talvez já esteja pareada. Estado atual:"
      curl -fsS -H "apikey: $KEY" "$URL/instance/connectionState/$INST"
      exit 0
    fi

    # salva e abre
    QR_FILE="/tmp/evolution-qr-$INST.html"
    cat > "$QR_FILE" <<EOF
<!DOCTYPE html><html><body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#111;color:#fff;font-family:sans-serif">
<div style="text-align:center"><h2>Pareia esse QR no WhatsApp do celular</h2>
<img src="$QR" style="width:400px"/>
<p>WhatsApp > Configurações > Aparelhos conectados > Conectar</p></div></body></html>
EOF
    if command -v open >/dev/null 2>&1; then open "$QR_FILE";
    elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$QR_FILE";
    else echo "Abre manualmente: $QR_FILE"; fi

    echo "Aguardando pareamento (timeout 90s)..."
    for i in {1..45}; do
      STATE=$(curl -fsS -H "apikey: $KEY" "$URL/instance/connectionState/$INST" 2>/dev/null | grep -oE '"state":"[^"]+"' | cut -d'"' -f4 || echo "?")
      if [[ "$STATE" == "open" ]]; then
        echo "Pareado!"
        exit 0
      fi
      sleep 2
    done
    echo "Pareamento não concluído. Roda esse comando de novo."
    ;;

  *)
    echo "Uso: $0 [up|stop|restart|logs|pair]"
    exit 1
    ;;
esac
