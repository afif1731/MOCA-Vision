import os
import cv2
import time
import json
import struct
import socket
import logging
import threading
import numpy as np
from collections import deque
from dotenv import load_dotenv
import tflite_runtime.interpreter as tflite

from lib.lib_ai.ai_utils import parse_size
from lib.lib_ai.detector import yolo_pose_extraction, gnn_classification
from lib.lib_ai.crowd_cluster import CentroidTracker, spatial_clustering
from lib.lib_ai.camera_stream import CameraStream

load_dotenv()

os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay"
os.environ["OPENCV_LOG_LEVEL"] = "FATAL"
os.environ["OPENCV_FFMPEG_LOGLEVEL"] = "-8"

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [AI-SERVER] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

CPU_USE_CORE = int(os.getenv("CPU_USE_CORE", "4"))
FRAME_SIZE = parse_size("STREAM_FRAME_SIZE", "640")
YOLO_IMGSZ = parse_size("YOLO_IMGSZ", "256")

YOLO_PERSON_CONFIDENCE_THRESHOLD = float(os.getenv("YOLO_PERSON_CONFIDENCE_THRESHOLD", "0.1"))
YOLO_IOU_THRESHOLD = float(os.getenv("YOLO_IOU_THRESHOLD", "0.3"))

GROUP_TRACKER_MAX_DISAPPEARED = int(os.getenv("GROUP_TRACKER_MAX_DISAPPEARED", "100"))
GROUP_TRACKER_MAX_DISTANCE = int(os.getenv("GROUP_TRACKER_MAX_DISTANCE", "150"))

INDIVIDUAL_TRACKER_MAX_DISAPPEARED = int(os.getenv("INDIVIDUAL_TRACKER_MAX_DISAPPEARED", "10"))
INDIVIDUAL_TRACKER_MAX_DISTANCE = int(os.getenv("INDIVIDUAL_TRACKER_MAX_DISTANCE", "70"))

SPATIAL_CLUSTERING_MAX_DISTANCE = int(os.getenv("SPATIAL_CLUSTERING_MAX_DISTANCE", "150"))

_SHARED_DELEGATE = None

def load_interpreter(model_path, model_name, force_cpu=False):
    global _SHARED_DELEGATE
    logger.info(f"Loading {model_name}...")

    if not force_cpu:
        try:
            delegate_lib = os.getenv('EDGETPU_SHARED_LIB', 'libedgetpu.so.1')

            if _SHARED_DELEGATE is None:
                _SHARED_DELEGATE = tflite.load_delegate(delegate_lib)

            interpreter = tflite.Interpreter(model_path=model_path, experimental_delegates=[_SHARED_DELEGATE], num_threads=CPU_USE_CORE)
            interpreter.allocate_tensors()
            
            interpreter._delegate_ref = _SHARED_DELEGATE 
            logger.info(f"Successfully loaded {model_name} with tflite_runtime delegate (Edge TPU).")
            return interpreter
        except Exception as e:
            logger.warning(f"Edge TPU delegate load failed for {model_name}: {e}. Falling back to CPU...")

    interpreter = tflite.Interpreter(model_path=model_path, num_threads=CPU_USE_CORE)
    interpreter.allocate_tensors()
    logger.info(f"Successfully loaded {model_name} on CPU.")
    return interpreter

def recv_exact(conn, n):
    data = bytearray()
    while len(data) < n:
        packet = conn.recv(n - len(data))
        if not packet:
            return None
        data.extend(packet)
    return data

def handle_client(conn, addr):
    logger.info(f"New client connected from {addr}")
    cap = None
    try:
        # 1. Terima Panjang Konfigurasi (4 byte)
        raw_msglen = recv_exact(conn, 4)
        if not raw_msglen:
            return
        msglen = struct.unpack('>I', raw_msglen)[0]
        
        # 2. Terima Data Konfigurasi JSON
        config_data = recv_exact(conn, msglen)
        if not config_data:
            return
        
        req = json.loads(config_data.decode('utf-8'))
        
        camera_id = req['camera_id']
        input_source = req['input_source']
        source_type = req['source_type']
        config = req['config']
        
        logger.info(f"[{camera_id}] Configuring camera source: {input_source}")
        
        classes = config['CLASSES']
        t_frames = config['T']
        v_joints = config['V']
        m_people = config['M']
        
        yolo_file = config.get('YOLO_FILE', 'yolov8n-pose_full_integer_quant_edgetpu.tflite')
        gnn_backbone_file = config.get('GNN_BACKBONE_FILE', 'GNN_TCN_backbone_best_int8_edgetpu.tflite')
        gnn_head_file = config.get('GNN_HEAD_FILE', 'GNN_TCN_head_best_int8.tflite')

        base_dir = os.path.dirname(os.path.abspath(__file__))
        yolo_path = os.path.join(base_dir, "_model", yolo_file)
        gnn_backbone_path = os.path.join(base_dir, "_model", gnn_backbone_file)
        gnn_head_path = os.path.join(base_dir, "_model", gnn_head_file)
        
        run_ai = config.get('run_ai', True)
        
        if run_ai:
            yolo_interpreter = load_interpreter(yolo_path, "YOLO Pose")
            gnn_backbone_interpreter = load_interpreter(gnn_backbone_path, "GNN-TCN Backbone")
            gnn_head_interpreter = load_interpreter(gnn_head_path, "GNN-TCN Head", force_cpu=True)
        else:
            logger.info(f"[{camera_id}] AI Inference is disabled.")

        if source_type == 'LOCAL':
            cap = CameraStream(int(input_source), is_static_file=False)
        elif source_type == 'STATIC_FILE':
            file_path = os.path.join(base_dir, "_video_sample", input_source)
            cap = CameraStream(file_path, is_static_file=True)
        else:
            cap = CameraStream(input_source, is_static_file=False)
            
        if cap is None or not cap.isOpened():
            logger.error(f"[{camera_id}] Failed to open video source: {input_source} (type: {source_type})")
            return

        tracker = CentroidTracker(
            max_disappeared=GROUP_TRACKER_MAX_DISAPPEARED,
            max_distance=GROUP_TRACKER_MAX_DISTANCE
        )
        individual_tracker = CentroidTracker(
            max_disappeared=INDIVIDUAL_TRACKER_MAX_DISAPPEARED,
            max_distance=INDIVIDUAL_TRACKER_MAX_DISTANCE
        )
        
        cluster_buffers = {}
        cluster_labels = {}
        cluster_slot_assignment = {}
        frame_count = 0

        logger.info(f"[{camera_id}] Starting AI Inference Loop...")
        
        encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 90]
        
        while cap.isOpened():
            # t_read_start = time.time()
            ret, frame = cap.read()
            # t_read_ms = (time.time() - t_read_start) * 1000.0
            
            if not ret:
                logger.warning(f"[{camera_id}] Failed to read frame from camera. Waiting...")
                time.sleep(1.0)
                continue

            # t_resize_start = time.time()
            frame = cv2.resize(frame, FRAME_SIZE)
            # t_resize_ms = (time.time() - t_resize_start) * 1000.0
            
            events = []
            # yolo_pre_ms, yolo_infer_ms, yolo_post_ms = 0.0, 0.0, 0.0
            # t_indv_total_ms, t_clus_total_ms, t_grp_total_ms = 0.0, 0.0, 0.0
            # total_gnn_pre_ms, total_gnn_bb_ms, total_gnn_pool_ms, total_gnn_head_ms = 0.0, 0.0, 0.0, 0.0
            # num_people, num_group = 0, 0
            
            if run_ai:
                # --- PROSES YOLO POSE ---
                people, _ = yolo_pose_extraction(
                    yolo_interpreter=yolo_interpreter,
                    frame=frame,
                    conf_thresh=YOLO_PERSON_CONFIDENCE_THRESHOLD,
                    iou_thresh=YOLO_IOU_THRESHOLD,
                    imgsz=YOLO_IMGSZ
                )
                # yolo_pre_ms, yolo_infer_ms, yolo_post_ms = yolo_times
                # num_people = len(people)
                
                # --- INDIVIDUAL TRACKING ---
                # t_indv_start = time.time()
                all_pelvis = [p["pelvis"] for p in people]
                tracked_individuals = individual_tracker.update(all_pelvis)
                for idx, person in enumerate(people):
                    person["individual_id"] = tracked_individuals.get(idx, -1)
                # t_indv_total_ms = (time.time() - t_indv_start) * 1000.0
                
                # t_clus_start = time.time()
                clusters = spatial_clustering(
                    people=people,
                    max_distance=SPATIAL_CLUSTERING_MAX_DISTANCE
                )
                # t_clus_total_ms = (time.time() - t_clus_start) * 1000.0
                
                # t_grp_start = time.time()
                cluster_centroids = []
                for cluster in clusters:
                    cx = sum(p["pelvis"][0] for p in cluster) / len(cluster)
                    cy = sum(p["pelvis"][1] for p in cluster) / len(cluster)
                    cluster_centroids.append([cx, cy])
                    
                tracked = tracker.update(cluster_centroids)
                # t_grp_total_ms = (time.time() - t_grp_start) * 1000.0
                # num_group = len(tracked)
                
                active_ind_ids = set(individual_tracker.objects.keys())
                
                for cluster_idx, object_id in tracked.items():
                    if object_id not in cluster_buffers:
                        cluster_buffers[object_id] = deque(maxlen=t_frames)
                        cluster_labels[object_id] = {"label": "analyzing", "conf": 0.0}
                        cluster_slot_assignment[object_id] = {}
                        
                    cluster_people = clusters[cluster_idx]
                    
                    slot_assignment = cluster_slot_assignment[object_id]
                    
                    # Prune old individuals
                    for ind_id in list(slot_assignment.keys()):
                        if ind_id not in active_ind_ids:
                            del slot_assignment[ind_id]
                            
                    used_slots = set(slot_assignment.values())
                    
                    # Assign new individuals
                    for person in cluster_people:
                        ind_id = person["individual_id"]
                        if ind_id == -1:
                            continue
                        if ind_id not in slot_assignment:
                            for slot in range(m_people):
                                if slot not in used_slots:
                                    slot_assignment[ind_id] = slot
                                    used_slots.add(slot)
                                    break
                                    
                    frame_pose_data = np.zeros((3, v_joints, m_people))
                    absolute_skeletons = []
                    
                    for person in cluster_people:
                        ind_id = person["individual_id"]
                        if ind_id in slot_assignment:
                            m = slot_assignment[ind_id]
                            if m < m_people:
                                frame_pose_data[:, :, m] = person["relative_kpts"]
                                # # [DEBUG HACK] Duplikat orang ini ke slot M lainnya agar tidak ada nol
                                # for temp_m in range(m_people):
                                #     if temp_m != m:
                                #         frame_pose_data[:, :, temp_m] = person["relative_kpts"]
                        
                        absolute_skeletons.append({
                            "box": person["box"],
                            "keypoints": person["keypoints"]
                        })
                    
                    cluster_buffers[object_id].append(frame_pose_data)
                    
                    # --- PROSES GCN-TCN ---
                    new_label, new_conf, _, _ = gnn_classification(
                        classes,
                        gnn_backbone_interpreter,
                        gnn_head_interpreter,
                        cluster_buffers[object_id],
                        frame_count,
                        t_frames
                    )
                    
                    # total_gnn_pre_ms += gnn_times[0]
                    # total_gnn_bb_ms += gnn_times[1]
                    # total_gnn_pool_ms += gnn_times[2]
                    # total_gnn_head_ms += gnn_times[3]
                    
                    if new_label is not None and new_conf is not None:
                        cluster_labels[object_id]["label"] = new_label
                        cluster_labels[object_id]["conf"] = new_conf
                        
                        # log_str = ", ".join([f"{k}: {v:.3f}" for k, v in all_conf.items()])
                        # logger.info(f"[{camera_id}] GCN Output Group {object_id} -> {log_str}")
                        
                    current_label = cluster_labels[object_id]["label"]
                    current_conf = cluster_labels[object_id]["conf"]
                    
                    events.append({
                        "group_id": object_id,
                        "label": current_label,
                        "confidence": round(current_conf, 2),
                        "num_persons": len(cluster_people),
                        "skeletons": absolute_skeletons
                    })
                
            active_object_ids = set(tracked.values()) if run_ai else set()
            for obj_id in list(cluster_buffers.keys()):
                if obj_id not in active_object_ids and obj_id not in tracker.objects:
                    del cluster_buffers[obj_id]
                    del cluster_labels[obj_id]
                    if obj_id in cluster_slot_assignment:
                        del cluster_slot_assignment[obj_id]
                    
            # t_tx_start = time.time()
            # Encode frame to JPEG
            ret, jpeg = cv2.imencode('.jpg', frame, encode_param)
            jpeg_bytes = jpeg.tobytes()
            
            # Encode events to JSON
            json_bytes = json.dumps(events).encode('utf-8')
            
            # Transmit (Lengths + Payloads)
            header = struct.pack('>I', len(jpeg_bytes))
            conn.sendall(header + jpeg_bytes)
            
            header_json = struct.pack('>I', len(json_bytes))
            conn.sendall(header_json + json_bytes)
            
            # t_tx_ms = (time.time() - t_tx_start) * 1000.0
            
            # logger.info(f"frame {frame_count}: , num_people: {num_people} , num_group: {num_group} , read: {t_read_ms:.1f} , resize: {t_resize_ms:.1f} , yolo_pre: {yolo_pre_ms:.1f} , yolo_infer: {yolo_infer_ms:.1f} , yolo_post: {yolo_post_ms:.1f} , track_indv_total: {t_indv_total_ms:.1f} , clustering_total: {t_clus_total_ms:.1f} , track_group_total: {t_grp_total_ms:.1f} , gnn_pre: {total_gnn_pre_ms:.1f} , gnn_backbone: {total_gnn_bb_ms:.1f} , gnn_pool: {total_gnn_pool_ms:.1f} , gnn_head: {total_gnn_head_ms:.1f} , transmit: {t_tx_ms:.1f}")
            
            if frame_count % 5 == 0:
                frame_count = 0

            frame_count += 1
            
    except (ConnectionResetError, BrokenPipeError):
        logger.info(f"Client {addr} disconnected.")
    except Exception as e:
        logger.error(f"Error handling client {addr}: {e}", exc_info=True)
    finally:
        if cap:
            cap.release()
        conn.close()

def start_server(host='127.0.0.1', port=5000):
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((host, port))
    server.listen(5)
    logger.info(f"AI Server listening on {host}:{port}")
    
    try:
        while True:
            conn, addr = server.accept()
            client_thread = threading.Thread(target=handle_client, args=(conn, addr), daemon=True)
            client_thread.start()
    except KeyboardInterrupt:
        logger.info("Shutting down AI Server...")
    finally:
        server.close()

if __name__ == '__main__':
    start_server()
