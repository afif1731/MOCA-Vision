import os
import faulthandler
import asyncio
import logging
import signal
from uuid6 import uuid7
from dotenv import load_dotenv
from livekit.rtc import Room

from lib.lib_app.get_camera import fetch_cameras
from lib.lib_app.camera_process import run_camera_process
from lib.lib_app.livekit_message_publish import device_status_loop
from lib.lib_app.livekit_access_token import fetch_access_token, token_renewal_loop
from lib.lib_app.websocket_manager import edge_control_channel

os.environ['GLOG_v'] = '2'
os.environ['GLOG_minloglevel'] = '0'

faulthandler.enable()

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

load_dotenv()

LIVEKIT_URL = os.getenv('LIVEKIT_URL', 'ws://127.0.0.1:7880')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://localhost:4000')

YOLO_FILE = os.getenv('YOLO_FILE', 'yolov8n-pose_full_integer_quant_edgetpu.tflite')
GNN_BACKBONE_FILE = os.getenv('GNN_BACKBONE_FILE', 'GNN_TCN_backbone_best_int8_edgetpu.tflite')
GNN_HEAD_FILE = os.getenv('GNN_HEAD_FILE', 'GNN_TCN_head_best_int8.tflite')

DEVICE_SECRET = os.getenv('LIVEKIT_DEVICE_SECRET', 'supersecretvalue')
DEVICE_ID = os.getenv('DEVICE_ID', 'not_set')

if DEVICE_ID == 'not_set':
    logger.warning("Device ID not found, generating a new DEVICE_ID (Device ID will change every time the application restarts)")
    DEVICE_ID = str(uuid7())

CAMERAS = []

CLASSES = ['assault', 'fighting', 'shooting', 'robbery', 'normal_event']
T, V, M = 100, 17, 3  # Time frames, Vertices (joints), Max People

CONFIG = {
    "CLASSES": CLASSES,
    "T": T,
    "V": V,
    "M": M,
    "YOLO_FILE": YOLO_FILE,
    "GNN_BACKBONE_FILE": GNN_BACKBONE_FILE,
    "GNN_HEAD_FILE": GNN_HEAD_FILE,
    "device_id": DEVICE_ID,
    "ws_control": None,
    "run_ai": True
}

async def main():
    global CAMERAS
    
    shutdown_event = asyncio.Event()
    room: Room | None = None
    active_tasks: dict = {}
    background_tasks: list[asyncio.Task] = []
    
    def handle_shutdown():
        logger.info("Received shutdown signal, shutting down...")
        shutdown_event.set()

    # Register signal handlers for graceful shutdown (Windows relies on Ctrl+C but works with SIGTERM/SIGINT if sent)
    loop = asyncio.get_running_loop()
    for sig in ('SIGINT', 'SIGTERM'):
        try:
            loop.add_signal_handler(getattr(signal, sig), handle_shutdown)
        except NotImplementedError:
            pass

    try:
        logger.info(f"Requesting LiveKit Token from {BACKEND_URL}...")
        token: str | None = None
        while not token and not shutdown_event.is_set():
            token = await fetch_access_token(
                device_id=DEVICE_ID,
                device_secret=DEVICE_SECRET,
                backend_url=BACKEND_URL
            )
            if not token:
                logger.error("Failed to retrieve access token from backend. Retrying in 10 seconds...")
                try:
                    await asyncio.wait_for(shutdown_event.wait(), timeout=10.0)
                except asyncio.TimeoutError:
                    pass

        if shutdown_event.is_set():
            return

        logger.info(f"Connecting to LiveKit Server {LIVEKIT_URL}...")
        room = Room()

        @room.on("disconnected")
        def on_disconnected(reason):
            logger.error(f"Room disconnected unexpectedly: {reason}")
            shutdown_event.set()

        await room.connect(LIVEKIT_URL, str(token))
        logger.info("Connected to WebRTC Room!")

        # Start token renewal background task
        background_tasks.append(asyncio.create_task(token_renewal_loop(
            device_id=DEVICE_ID,
            device_secret=DEVICE_SECRET,
            backend_url=BACKEND_URL
        )))

        # Start device status telemetry loop
        background_tasks.append(asyncio.create_task(device_status_loop(room, DEVICE_ID)))

        logger.info("Fetching camera configurations...")
        
        fetched_cameras = None
        while fetched_cameras is None and not shutdown_event.is_set():
            fetched_cameras_data = await fetch_cameras(
                device_id=DEVICE_ID,
                device_secret=DEVICE_SECRET,
                backend_url=BACKEND_URL
            )

            fetched_cameras = fetched_cameras_data.get("cameras", [])
            is_inference_active = fetched_cameras_data.get("is_inference_active", False)

            if is_inference_active:
                CONFIG["run_ai"] = True
            else:
                CONFIG["run_ai"] = False

            if fetched_cameras is None:
                logger.error("Failed to fetch camera configurations. Retrying in 10 seconds...")
                try:
                    await asyncio.wait_for(shutdown_event.wait(), timeout=10.0)
                except asyncio.TimeoutError:
                    pass
        
        if shutdown_event.is_set():
            return

        CAMERAS = fetched_cameras if fetched_cameras else []

        app_context = {
            'active_tasks': active_tasks,
            'cameras': CAMERAS,
            'room': room,
            'config': CONFIG,
            'backend_url': BACKEND_URL,
            'device_secret': DEVICE_SECRET
        }

        background_tasks.append(asyncio.create_task(edge_control_channel(
            device_id=DEVICE_ID,
            device_secret=DEVICE_SECRET,
            backend_ws_url=BACKEND_URL,
            app_context=app_context,
            shutdown_event=shutdown_event
        )))

        for camera in CAMERAS:
            logger.info(f"Setting up camera process for ID: {camera['id']}")

            active_tasks[camera['id']] = asyncio.create_task(
                run_camera_process(
                    camera=camera,
                    room=room,
                    config=CONFIG,
                    backend_url=BACKEND_URL,
                    device_secret=DEVICE_SECRET
                )
            )

        if not active_tasks:
            logger.info("No cameras configured. Edge Device running in idle mode.")

        await shutdown_event.wait()
    
    finally:
        logger.info("Shutdown initiated. Cleaning up...")

        all_tasks = [*background_tasks, *active_tasks.values()]
        for task in all_tasks:
            task.cancel()
        if all_tasks:
            try:
                await asyncio.wait_for(
                    asyncio.gather(*all_tasks, return_exceptions=True),
                    timeout=3.0
                )
            except asyncio.TimeoutError:
                logger.warning("Some background tasks took too long to shut down and were forcefully stopped.")

        if room is not None:
            logger.info("Disconnecting from room...")
            try:
                await asyncio.wait_for(room.disconnect(), timeout=5.0)
                logger.info("Disconnected cleanly.")
            except asyncio.TimeoutError:
                logger.error("room.disconnect() timed out.")
            except Exception as e:
                logger.error(f"Error during disconnect: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Edge Device stopped manually (KeyboardInterrupt).")
