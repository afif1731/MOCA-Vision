import asyncio
import os
import cv2
import time
import json
import struct
import socket
import asyncio
import logging
import numpy as np

from livekit import rtc
from lib.utils import validate_file
from lib.lib_app.livekit_message_publish import publish_violence_detection
from lib.utils import text_aes_decrypt, parse_size

logger = logging.getLogger(__name__)

def recv_exact(sock, n):
    data = bytearray()
    while len(data) < n:
        packet = sock.recv(n - len(data))
        if not packet:
            return None
        data.extend(packet)
    return data

async def run_camera_process(camera, room, config, backend_url, device_secret):
    from lib.lib_app.websocket_manager import send_to_backend
    """
    Menjalankan proses pengiriman data ke LiveKit untuk satu kamera spesifik.
    (Berperan sebagai TCP Client untuk AI Server)
    """
    camera_id = camera['id']
    input_source = camera['source']
    source_type = camera['source_type']
    rtsp_username = camera['rtsp_username']
    rtsp_password = camera['rtsp_password']
    rtsp_iv = camera['rtsp_iv']
    rtsp_authtag = camera['rtsp_authtag']

    camera_source = input_source

    # Validasi File (Download jika belum ada)
    if source_type == 'STATIC_FILE':
        current_dir = os.path.dirname(os.path.abspath(__file__))
        base_dir = os.path.dirname(os.path.dirname(current_dir))
        file_path = os.path.join(base_dir, "_video_sample", input_source)
        await validate_file(file_path, input_source, backend_url)

    if source_type == 'RTSP_LINK':
        actual_password = text_aes_decrypt(
            encrypted_hex=rtsp_password,
            iv_hex=rtsp_iv,
            auth_tag_hex=rtsp_authtag,
            secret=device_secret
        )

        camera_source = f"rtsp://{rtsp_username}:{actual_password}@{input_source}"
        
    livekit_track_name = f"track_{camera_id}"
    
    logger.info(f"Setting up LiveKit transmission for camera {camera_id}")
    frame_size = parse_size("STREAM_FRAME_SIZE", "640")
    source = rtc.VideoSource(frame_size[0], frame_size[1])
    track = rtc.LocalVideoTrack.create_video_track(livekit_track_name, source)
    options = rtc.TrackPublishOptions()
    options.source = rtc.TrackSource.SOURCE_CAMERA

    publication = await room.local_participant.publish_track(track, options)

    logger.info(f"[{camera_id}] Connecting to AI Server at 127.0.0.1:5000...")
    client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    # Hubungkan ke AI Server (Tunggu jika server belum siap)
    connected = False
    while not connected:
        try:
            # Jalankan blokir socket secara asynchronous
            await asyncio.to_thread(client.connect, ('127.0.0.1', 5000))
            connected = True
        except ConnectionRefusedError:
            logger.warning(f"[{camera_id}] AI Server not ready. Retrying in 3 seconds...")
            await asyncio.sleep(3)
        except asyncio.CancelledError:
            client.close()
            return
            
    logger.info(f"[{camera_id}] Connected to AI Server!")
    
    # Kirim Payload Konfigurasi ke AI Server
    clean_config = {k: v for k, v in config.items() if k not in ["control_ws", "ws_control"]}
    req_payload = {
        "camera_id": camera_id,
        "input_source": camera_source,
        "source_type": source_type,
        "config": clean_config
    }
    req_bytes = json.dumps(req_payload).encode('utf-8')
    header = struct.pack('>I', len(req_bytes))
    
    await asyncio.to_thread(client.sendall, header + req_bytes)
    
    prev_time = time.time()
    last_publish_time = 0.0
    
    try:
        frame_iteration = 0
        while True:
            frame_iteration += 1
            t_recv_start = time.time()
            
            # 1. Baca Header JPEG (4 bytes)
            jpeg_header = await asyncio.to_thread(recv_exact, client, 4)
            if not jpeg_header:
                logger.warning(f"[{camera_id}] Connection to AI Server closed.")
                break
                
            jpeg_len = struct.unpack('>I', jpeg_header)[0]
            
            # 2. Baca Data JPEG
            jpeg_bytes = await asyncio.to_thread(recv_exact, client, jpeg_len)
            if not jpeg_bytes:
                break
                
            # 3. Baca Header JSON (4 bytes)
            json_header = await asyncio.to_thread(recv_exact, client, 4)
            if not json_header:
                break
                
            json_len = struct.unpack('>I', json_header)[0]
            
            # 4. Baca Data JSON
            json_bytes = await asyncio.to_thread(recv_exact, client, json_len)
            if not json_bytes:
                break
                
            receive_ai_time = (time.time() - t_recv_start) * 1000.0
            
            t_post_start = time.time()
            events = json.loads(json_bytes.decode('utf-8'))
            
            # --- HITUNG FPS ---
            current_time = time.time()
            fps = 1.0 / (current_time - prev_time) if (current_time - prev_time) > 0 else 0.0
            prev_time = current_time
            
            # --- PUBLISH METADATA KE LIVEKIT ---
            detection_data = {
                "camera_id": camera_id,
                "fps": round(fps, 1),
                "events": events
            }

            violence_events = [e for e in events if e.get("label") not in ["normal_event", "analyzing"]]

            ws_detection_payload = {
                "type": "violence_detection",
                "payload": {
                    "camera_id": camera_id,
                    "events": [
                        {
                            "group_id": event["group_id"],
                            "label": event["label"],
                            "confidence": event["confidence"],
                            "num_persons": len(event.get("skeletons", []))
                        }
                        for event in violence_events
                    ]
                }
            }
            
            should_publish = True
            if not config.get('run_ai', True):
                if current_time - last_publish_time < 5.0:
                    should_publish = False
                else:
                    last_publish_time = current_time
                    
            # --- PUBLISH FRAME KE LIVEKIT ---
            # Decode JPEG kembali ke format OpenCV Matrix (BGR)
            np_arr = np.frombuffer(jpeg_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            
            lk_frame = None
            if frame is not None:
                # Convert BGR ke RGB untuk WebRTC
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                
                lk_frame = rtc.VideoFrame(
                    width=rgb_frame.shape[1], 
                    height=rgb_frame.shape[0], 
                    type=rtc.VideoBufferType.RGB24, 
                    data=rgb_frame.tobytes()
                )
                
            post_process_time = (time.time() - t_post_start) * 1000.0
            
            publish_stream_time = 0.0
            if lk_frame is not None:
                t_pub_stream_start = time.time()
                source.capture_frame(lk_frame)
                publish_stream_time = (time.time() - t_pub_stream_start) * 1000.0
                
            publish_livekit_time = 0.0
            if should_publish:
                t_pub_lk_start = time.time()
                await publish_violence_detection(detection_data, room)
                publish_livekit_time = (time.time() - t_pub_lk_start) * 1000.0
            
            publish_backend_time = 0.0
            if should_publish and len(violence_events) > 0:
                t_pub_be_start = time.time()
                await send_to_backend(config, ws_detection_payload)
                publish_backend_time = (time.time() - t_pub_be_start) * 1000.0
                
            logger.info(f"frame {frame_iteration}: , receive_ai: {receive_ai_time:.1f} , post_process: {post_process_time:.1f} , publish_stream: {publish_stream_time:.1f} , publish_livekit: {publish_livekit_time:.1f} , publish_backend: {publish_backend_time:.1f}")
            
            await asyncio.sleep(0.001)

    except asyncio.CancelledError:
        logger.info(f"Camera task {camera_id} cancelled.")
    finally:
        logger.info(f"Shutting down camera client {camera_id}...")
        client.close()
        try:
            await asyncio.wait_for(room.local_participant.unpublish_track(publication.sid), timeout=2.0)
            logger.info(f"[{camera_id}] Track unpublished.")
        except asyncio.TimeoutError:
            logger.warning(f"[{camera_id}] unpublish_track timed out.")
        except Exception as e:
            logger.error(f"[{camera_id}] Failed to unpublish track: {e}")
