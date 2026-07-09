import asyncio
import json
import hmac
import hashlib
import logging

import websockets
from websockets.exceptions import ConnectionClosed

from consumer.routes import route_backend_request

logger = logging.getLogger(__name__)

RECONNECT_DELAY = 5.0

async def _listen(ws, app_context: dict):
  """Loop menerima perintah dari backend."""
  async for raw in ws:
    try:
      msg = json.loads(raw)
    except json.JSONDecodeError:
      logger.error(f"Pesan bukan JSON valid: {raw[:120]}")
      continue

    try:
      await route_backend_request(msg, app_context)
    except Exception as e:
      logger.error(f"Gagal memproses perintah: {e}")

async def _heartbeat(ws, interval: float = 20.0):
  """Kirim heartbeat agar backend tahu koneksi hidup."""
  while True:
    await asyncio.sleep(interval)
    await ws.send(json.dumps({"type": "heartbeat"}))

async def edge_control_channel(
    device_id: str,
    device_secret: str,
    backend_ws_url: str,
    app_context: dict,
    shutdown_event: asyncio.Event,
):
  """Menjaga koneksi WS ke backend, auto-reconnect sampai shutdown."""
  import time
  import urllib.parse
  
  parsed = urllib.parse.urlparse(backend_ws_url)
  scheme = 'wss' if parsed.scheme == 'https' else 'ws'
  ws_base = f"{scheme}://{parsed.netloc}{parsed.path}"
  
  while not shutdown_event.is_set():
    timestamp = int(time.time() * 1000)
    payload = f"{device_id}:{timestamp}"

    signature = hmac.new(
        device_secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    url = f"{ws_base}/ws/edge?device_id={device_id}&secret={signature}&timestamp={timestamp}"

    try:
      async with websockets.connect(
        url,
        ping_interval=20,
        ping_timeout=20,
        close_timeout=5,
        max_size=2**20,
      ) as ws:
        app_context["config"]["control_ws"] = ws
        logger.info("✅ Control channel connected to backend")

        listen_task = asyncio.create_task(_listen(ws, app_context))
        hb_task = asyncio.create_task(_heartbeat(ws))
        shutdown_task = asyncio.create_task(shutdown_event.wait())

        done, pending = await asyncio.wait(
          [listen_task, hb_task, shutdown_task],
          return_when=asyncio.FIRST_COMPLETED,
        )
        for task in pending:
          task.cancel()
        await asyncio.gather(*pending, return_exceptions=True)

        if shutdown_event.is_set():
          return

    except ConnectionClosed as e:
      logger.warning(f"Control channel closed: {e}")
    except OSError as e:
      logger.error(f"Failed to connect to backend: {e}")
    except Exception as e:
      logger.error(f"Control channel error: {e}")
    finally:
      app_context["config"]["control_ws"] = None

    if shutdown_event.is_set():
      return

    logger.info(f"Reconnecting in {RECONNECT_DELAY}s...")
    try:
      await asyncio.wait_for(shutdown_event.wait(), timeout=RECONNECT_DELAY)
    except asyncio.TimeoutError:
      pass

async def send_to_backend(config: dict, message: dict) -> bool:
  """Kirim pesan naik ke backend (mis. laporan deteksi)."""
  ws = config.get("control_ws")
  if ws is None:
    logger.warning("Control channel not ready yet. Skipping..")
    return False
  try:
    await ws.send(json.dumps(message))
    return True
  except Exception as e:
    logger.error(f"Failed to send to backend: {e}")
    return False