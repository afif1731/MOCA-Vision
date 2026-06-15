import os
import json
import psutil
import asyncio
import logging
from livekit.rtc import Room

logger = logging.getLogger(__name__)

def get_temperature():
    temp = 0.0
    try:
        # Try psutil first
        if hasattr(psutil, 'sensors_temperatures'):
            temps = psutil.sensors_temperatures()
            if temps:
                # Prefer typical cpu thermal sensors
                for key in ['cpu_thermal', 'cpu-thermal', 'coretemp', 'soc_thermal']:
                    if key in temps and temps[key]:
                        return temps[key][0].current
                # Fallback to the first available sensor
                for name, entries in temps.items():
                    if entries:
                        return entries[0].current
    except Exception:
        pass

    try:
        if os.path.exists('/sys/class/thermal/thermal_zone0/temp'):
            with open('/sys/class/thermal/thermal_zone0/temp', 'r') as f:
                return float(f.read().strip()) / 1000.0
    except Exception:
        pass
    
    return temp

async def publish_device_status(room: Room, device_id: str):
    try:
        cpu = psutil.cpu_percent(interval=None)
        mem = psutil.virtual_memory()
        ram = mem.used
        disk = psutil.disk_usage('/')
        storage = disk.used

        payload = {
            "id": device_id,
            "cpu": round(cpu, 2),
            "ram": round(ram / (1024 * 1024 * 1024), 2),
            "storage": round(storage / (1024 * 1024 * 1024), 2),
            "temperature": round(get_temperature(), 2)
        }
        
        payload_bytes = json.dumps(payload).encode('utf-8')
        
        await room.local_participant.publish_data(
            payload_bytes,
            reliable=False,
            topic='device_status'
        )
    except Exception as e:
        logger.error(f"Failed to send device status: {e}")

async def publish_violence_detection(detection_data: dict, room: Room):
    try:
        payload_bytes = json.dumps(detection_data).encode('utf-8')

        await room.local_participant.publish_data(
            payload_bytes,
            reliable=False,
            topic='violence_detection'
        )
    except Exception as e:
        logger.error(f"Failed to send detection result: {e}")

async def device_status_loop(room: Room, device_id: str):
    """Loop background untuk mengirim status (telemetri) edge device ke backend setiap 5 detik"""
    while True:
        await publish_device_status(room, device_id)
        await asyncio.sleep(5)