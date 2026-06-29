import os
os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = "rtsp_transport;tcp|fflags;nobuffer|flags;low_delay"
os.environ["OPENCV_LOG_LEVEL"] = "FATAL"
os.environ["OPENCV_FFMPEG_LOGLEVEL"] = "-8"
import cv2
import time
import json
import struct
import socket
import logging
import threading
import numpy as np
from collections import deque
import tflite_runtime.interpreter as tflite

from lib.lib_ai.camera_stream import CameraStream

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [AI-SERVER] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)


FRAME_SIZE = 640
YOLO_IMGSZ = 256

YOLO_PERSON_CONFIDENCE_THRESHOLD = 0.15
YOLO_IOU_THRESHOLD = 0.45

GROUP_TRACKER_MAX_DISAPPEARED = 200
GROUP_TRACKER_MAX_DISTANCE = 300

INDIVIDUAL_TRACKER_MAX_DISAPPEARED = 30
INDIVIDUAL_TRACKER_MAX_DISTANCE = 150

SPATIAL_CLUSTERING_MAX_DISTANCE = 200

def load_interpreter(model_path, model_name):
    logger.info(f"Loading {model_name}...")

    try:
        delegate_lib = os.getenv('EDGETPU_SHARED_LIB', 'libedgetpu.so.1')

        delegate = tflite.load_delegate(delegate_lib)
        interpreter = tflite.Interpreter(model_path=model_path, experimental_delegates=[delegate], num_threads=4)
        interpreter.allocate_tensors()
        
        interpreter._delegate_ref = delegate 
        logger.info(f"Successfully loaded {model_name} with tflite_runtime delegate (Edge TPU).")
        return interpreter
    except Exception as e:
        logger.warning(f"Edge TPU delegate load failed for {model_name}: {e}. Falling back to CPU...")

    interpreter = tflite.Interpreter(model_path=model_path, num_threads=4)
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

def calculate_distance(p1, p2):
    return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)

def spatial_clustering(people, max_distance=200):
    """
    Mengelompokkan orang berdasarkan jarak Euclidean antara koordinat pelvis.
    people: list of dict, misal: [{"pelvis": [x, y], ...}, ...]
    Mengembalikan list of clusters, di mana tiap cluster adalah list of dicts.
    """
    if not people:
        return []

    clusters = []
    visited = set()
    
    for i in range(len(people)):
        if i in visited:
            continue
            
        current_cluster = [people[i]]
        visited.add(i)
        
        while True:
            added = False
            for j in range(len(people)):
                if j in visited:
                    continue
                
                for member in current_cluster:
                    dist = calculate_distance(people[j]["pelvis"], member["pelvis"])
                    if dist <= max_distance:
                        current_cluster.append(people[j])
                        visited.add(j)
                        added = True
                        break 
            if not added:
                break
                
        clusters.append(current_cluster)
        
    return clusters

class CentroidTracker:
    def __init__(self, max_disappeared=50, max_distance=300):
        self.next_object_id = 0
        self.objects = {}
        self.disappeared = {}

        self.max_disappeared = max_disappeared
        self.max_distance = max_distance

    def register(self, centroid):
        self.objects[self.next_object_id] = centroid
        self.disappeared[self.next_object_id] = 0
        self.next_object_id += 1
        return self.next_object_id - 1

    def deregister(self, object_id):
        del self.objects[object_id]
        del self.disappeared[object_id]

    def update(self, cluster_centroids):
        """
        cluster_centroids: list of [x, y]
        Mengembalikan dict mapping dari index array cluster_centroids ke object_id
        """
        if len(cluster_centroids) == 0:
            for object_id in list(self.disappeared.keys()):
                self.disappeared[object_id] += 1
                if self.disappeared[object_id] > self.max_disappeared:
                    self.deregister(object_id)
            return {}

        if len(self.objects) == 0:
            tracked = {}
            for i in range(len(cluster_centroids)):
                tracked[i] = self.register(cluster_centroids[i])
            return tracked

        object_ids = list(self.objects.keys())
        object_centroids = list(self.objects.values())

        D = np.zeros((len(object_centroids), len(cluster_centroids)))
        for i, oc in enumerate(object_centroids):
            for j, cc in enumerate(cluster_centroids):
                D[i, j] = calculate_distance(oc, cc)

        rows = D.min(axis=1).argsort()
        cols = D.argmin(axis=1)[rows]

        used_rows = set()
        used_cols = set()
        
        tracked = {}

        for row, col in zip(rows, cols):
            if row in used_rows or col in used_cols:
                continue

            if D[row, col] > self.max_distance:
                continue

            object_id = object_ids[row]
            self.objects[object_id] = cluster_centroids[col]
            self.disappeared[object_id] = 0
            
            tracked[col] = object_id

            used_rows.add(row)
            used_cols.add(col)

        unused_rows = set(range(0, D.shape[0])).difference(used_rows)
        unused_cols = set(range(0, D.shape[1])).difference(used_cols)

        for row in unused_rows:
            object_id = object_ids[row]
            self.disappeared[object_id] += 1
            if self.disappeared[object_id] > self.max_disappeared:
                self.deregister(object_id)

        for col in unused_cols:
            tracked[col] = self.register(cluster_centroids[col])

        return tracked

def yolo_pose_extraction(yolo_interpreter: tflite.Interpreter, frame: np.ndarray, conf_thresh=0.25, iou_thresh=0.45, imgsz=None):
    t0 = time.time()
    
    input_details = yolo_interpreter.get_input_details()[0]
    output_details = yolo_interpreter.get_output_details()[0]
    
    input_shape = input_details['shape']

    is_space_to_depth = False
    if imgsz is not None:
        input_height, input_width = imgsz, imgsz
        if len(input_shape) == 4 and input_shape[-1] == 12:
            is_space_to_depth = True
    elif len(input_shape) == 4:
        if input_shape[-1] == 12: # Deteksi model EdgeTPU dengan Space-to-Depth 2x2
            input_height, input_width = input_shape[1] * 2, input_shape[2] * 2
            is_space_to_depth = True
        elif input_shape[1] == 3: # NCHW
            input_height, input_width = input_shape[2], input_shape[3]
        else: # NHWC standar
            input_height, input_width = input_shape[1], input_shape[2]
    else:
        input_height, input_width = 512, 512
        
    shape = frame.shape[:2]
    r = min(input_height / shape[0], input_width / shape[1])
    new_unpad = int(round(shape[1] * r)), int(round(shape[0] * r))
    dw, dh = input_width - new_unpad[0], input_height - new_unpad[1]
    dw /= 2
    dh /= 2
    
    img = cv2.resize(frame, new_unpad, interpolation=cv2.INTER_LINEAR)
    top, bottom = int(round(dh - 0.1)), int(round(dh + 0.1))
    left, right = int(round(dw - 0.1)), int(round(dw + 0.1))
    img = cv2.copyMakeBorder(img, top, bottom, left, right, cv2.BORDER_CONSTANT, value=(114, 114, 114))
    
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    input_scale, input_zp = input_details['quantization']
    if input_scale > 0:
        factor = 1.0 / (255.0 * input_scale)
        if input_details['dtype'] == np.int8:
            input_data = img_rgb.astype(np.float32)
            input_data *= factor
            input_data += input_zp
            np.round(input_data, out=input_data)
            input_data = np.clip(input_data, -128, 127).astype(np.int8)
        else:
            input_data = img_rgb.astype(np.float32)
            input_data *= factor
            input_data += input_zp
            np.round(input_data, out=input_data)
            input_data = np.clip(input_data, 0, 255).astype(np.uint8)
    else:
        input_data = (img_rgb / 255.0).astype(np.float32)
        
    input_data = np.expand_dims(input_data, axis=0)
    
    if is_space_to_depth:
        b, h, w, c = input_data.shape
        # Mengubah dari (1, 512, 512, 3) menjadi (1, 256, 256, 12)
        input_data = input_data.reshape(b, h // 2, 2, w // 2, 2, c)
        input_data = input_data.transpose(0, 1, 3, 2, 4, 5)
        input_data = input_data.reshape(b, h // 2, w // 2, c * 4)
    elif len(input_shape) == 4 and input_shape[1] == 3:
        input_data = np.transpose(input_data, (0, 3, 1, 2))
            
    yolo_interpreter.set_tensor(input_details['index'], input_data)
    
    t1 = time.time()
    yolo_interpreter.invoke()
    t2 = time.time()
    
    output_data = yolo_interpreter.get_tensor(output_details['index'])
    
    out_scale, out_zp = output_details['quantization']
    if out_scale > 0:
        quantized_thresh = int(round((conf_thresh / out_scale) + out_zp))
        
        if len(output_data.shape) == 3 and output_data.shape[1] == 56:
            preds_int8 = output_data[0] # shape (56, 5376)
            scores_int8 = preds_int8[4, :]
            valid_idx = scores_int8 > quantized_thresh
            
            filtered_preds_int8 = preds_int8[:, valid_idx].T
            preds = (filtered_preds_int8.astype(np.float32) - out_zp) * out_scale
        else:
            preds_int8 = output_data[0].T if output_data.shape[1] < output_data.shape[2] else output_data[0]
            scores_int8 = preds_int8[:, 4]
            valid_idx = scores_int8 > quantized_thresh
            
            filtered_preds_int8 = preds_int8[valid_idx]
            preds = (filtered_preds_int8.astype(np.float32) - out_zp) * out_scale
            
        scores = preds[:, 4]
    else:
        if len(output_data.shape) == 3 and output_data.shape[1] == 56:
            preds = output_data[0].T
        else:
            preds = output_data[0].T if output_data.shape[1] < output_data.shape[2] else output_data[0]
            
        raw_scores = preds[:, 4]
        valid_idx = raw_scores > conf_thresh
        preds = preds[valid_idx]
        scores = preds[:, 4]
    
    boxes = preds[:, :4]
    x = boxes[:, 0] * input_width
    y = boxes[:, 1] * input_height
    w = boxes[:, 2] * input_width
    h = boxes[:, 3] * input_height
    
    x = (x - dw) / r
    y = (y - dh) / r
    w = w / r
    h = h / r
    
    x1 = x - w / 2
    y1 = y - h / 2
    
    people = []
    
    if len(x1) > 0:
        x2 = x1 + w
        y2 = y1 + h
        areas = w * h
        order = scores.argsort()[::-1]
        
        keep = []
        while order.size > 0:
            i = order[0]
            keep.append(i)
            if order.size == 1:
                break
                
            xx1 = np.maximum(x1[i], x1[order[1:]])
            yy1 = np.maximum(y1[i], y1[order[1:]])
            xx2 = np.minimum(x2[i], x2[order[1:]])
            yy2 = np.minimum(y2[i], y2[order[1:]])
            
            w_inter = np.maximum(0.0, xx2 - xx1)
            h_inter = np.maximum(0.0, yy2 - yy1)
            inter = w_inter * h_inter
            
            ovr = inter / (areas[i] + areas[order[1:]] - inter)
            inds = np.where(ovr <= iou_thresh)[0]
            order = order[inds + 1]
            
        sorted_indices = keep
        
        for idx in sorted_indices:
            kpts = preds[idx, 5:56].reshape((17, 3))
            kpts[:, 0] = (kpts[:, 0] * input_width - dw) / r
            kpts[:, 1] = (kpts[:, 1] * input_height - dh) / r
            
            hip_l, hip_r = kpts[11], kpts[12]
            
            if hip_l[2] > 0.5 and hip_r[2] > 0.5:
                pelvis_x = float((hip_l[0] + hip_r[0]) / 2)
                pelvis_y = float((hip_l[1] + hip_r[1]) / 2)
                
                relative_kpts = np.zeros((3, 17))
                for v in range(17):
                    if kpts[v][2] > 0.5:
                        relative_kpts[0, v] = kpts[v][0] - pelvis_x
                        relative_kpts[1, v] = kpts[v][1] - pelvis_y
                        relative_kpts[2, v] = kpts[v][2]
                        
                people.append({
                    "box": [float(x1[idx]), float(y1[idx]), float(w[idx]), float(h[idx])],
                    "keypoints": kpts.tolist(),
                    "pelvis": [pelvis_x, pelvis_y],
                    "relative_kpts": relative_kpts
                })

    t3 = time.time()
    if np.random.rand() < 0.1:
        logger.info(f"YOLO INTERNAL (ms) - Pre: {(t1-t0)*1000:.1f} | EdgeTPU: {(t2-t1)*1000:.1f} | Post: {(t3-t2)*1000:.1f}")

    return people

def gnn_classification(CLASSES: list, gnn_backbone_interpreter: tflite.Interpreter, gnn_head_interpreter: tflite.Interpreter, pose_buffer: deque, frame_count: int, T: int):
    if len(pose_buffer) == T and frame_count % 5 == 0:
        t_start_gnn = time.time()
        # pose_buffer contains T frames of shape (C=3, V, M)
        tensor_data = np.stack(pose_buffer, axis=0) # shape: (T, C, V, M)
        tensor_data = np.transpose(tensor_data, (3, 0, 2, 1)) # shape: (M, T, V, C)

        M = tensor_data.shape[0]

        bb_input_details = gnn_backbone_interpreter.get_input_details()[0]
        bb_output_details = gnn_backbone_interpreter.get_output_details()[0]
        
        bb_in_scale, bb_in_zp = bb_input_details['quantization']
        bb_out_scale, bb_out_zp = bb_output_details['quantization']
        
        features_list = []
        t_bb_total = 0
        for m in range(M):
            person_data = tensor_data[m] # (T, V, C)
            input_tensor_float = np.expand_dims(person_data, axis=0).astype(np.float32) # (1, T, V, C)

            if bb_in_scale > 0:
                input_tensor_quantized = np.clip(np.round(input_tensor_float / bb_in_scale + bb_in_zp), -128, 127).astype(np.int8)
            else:
                input_tensor_quantized = input_tensor_float.astype(bb_input_details['dtype'])

            gnn_backbone_interpreter.set_tensor(bb_input_details['index'], input_tensor_quantized)
            
            t0 = time.time()
            gnn_backbone_interpreter.invoke()
            t_bb_total += (time.time() - t0)

            output_tensor_quantized = gnn_backbone_interpreter.get_tensor(bb_output_details['index'])
            
            if bb_out_scale > 0:
                features = (output_tensor_quantized[0].astype(np.float32) - bb_out_zp) * bb_out_scale
            else:
                features = output_tensor_quantized[0]
                
            features_list.append(features)

        # Max pooling across M people
        pooled_features = np.max(np.stack(features_list, axis=0), axis=0) # (hidden_dim,)
        
        head_input_details = gnn_head_interpreter.get_input_details()[0]
        head_output_details = gnn_head_interpreter.get_output_details()[0]
        
        head_in_scale, head_in_zp = head_input_details['quantization']
        head_out_scale, head_out_zp = head_output_details['quantization']
        
        head_input_float = np.expand_dims(pooled_features, axis=0).astype(np.float32) # (1, hidden_dim)

        if head_in_scale > 0:
            head_input_quantized = np.clip(np.round(head_input_float / head_in_scale + head_in_zp), -128, 127).astype(np.int8)
        else:
            head_input_quantized = head_input_float.astype(head_input_details['dtype'])

        gnn_head_interpreter.set_tensor(head_input_details['index'], head_input_quantized)
        
        t1 = time.time()
        gnn_head_interpreter.invoke()
        t_head = time.time() - t1

        head_output_quantized = gnn_head_interpreter.get_tensor(head_output_details['index'])

        if head_out_scale > 0:
            probs = (head_output_quantized[0].astype(np.float32) - head_out_zp) * head_out_scale
        else:
            probs = head_output_quantized[0]
            
        class_idx = int(np.argmax(probs))
        current_label = CLASSES[class_idx]
        current_conf = float(probs[class_idx])
        
        all_conf = {CLASSES[i]: float(probs[i]) for i in range(len(CLASSES))}
        
        logger.info(f"GNN Inference (ms) - Backbone (x{M}): {t_bb_total*1000:.1f} | Head: {t_head*1000:.1f} | Total: {(time.time()-t_start_gnn)*1000:.1f}")
        
        return current_label, current_conf, all_conf
    
    return None, None, None

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
        
        yolo_interpreter = load_interpreter(yolo_path, "YOLO Pose")
        gnn_backbone_interpreter = load_interpreter(gnn_backbone_path, "GNN-TCN Backbone")
        gnn_head_interpreter = load_interpreter(gnn_head_path, "GNN-TCN Head")

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
            t_start = time.time()
            
            ret, frame = cap.read()
            t_read = time.time()
            
            if not ret:
                logger.warning(f"[{camera_id}] Failed to read frame from camera. Waiting...")
                time.sleep(1.0)
                continue

            frame = cv2.resize(frame, (FRAME_SIZE, FRAME_SIZE))
            t_resize = time.time()
            
            # --- PROSES YOLO POSE ---
            people = yolo_pose_extraction(
                yolo_interpreter=yolo_interpreter,
                frame=frame,
                conf_thresh=YOLO_PERSON_CONFIDENCE_THRESHOLD,
                iou_thresh=YOLO_IOU_THRESHOLD,
                imgsz=YOLO_IMGSZ
            )
            t_yolo = time.time()
            
            # --- INDIVIDUAL TRACKING ---
            all_pelvis = [p["pelvis"] for p in people]
            tracked_individuals = individual_tracker.update(all_pelvis)
            for idx, person in enumerate(people):
                person["individual_id"] = tracked_individuals.get(idx, -1)
            
            clusters = spatial_clustering(
                people=people,
                max_distance=SPATIAL_CLUSTERING_MAX_DISTANCE
            )
            
            cluster_centroids = []
            for cluster in clusters:
                cx = sum(p["pelvis"][0] for p in cluster) / len(cluster)
                cy = sum(p["pelvis"][1] for p in cluster) / len(cluster)
                cluster_centroids.append([cx, cy])
                
            tracked = tracker.update(cluster_centroids)
            events = []
            
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
                            # [DEBUG HACK] Duplikat orang ini ke slot M lainnya agar tidak ada nol
                            for temp_m in range(m_people):
                                if temp_m != m:
                                    frame_pose_data[:, :, temp_m] = person["relative_kpts"]
                    
                    absolute_skeletons.append({
                        "box": person["box"],
                        "keypoints": person["keypoints"]
                    })
                
                cluster_buffers[object_id].append(frame_pose_data)
                
                # --- PROSES GCN-TCN ---
                new_label, new_conf, all_conf = gnn_classification(
                    classes,
                    gnn_backbone_interpreter,
                    gnn_head_interpreter,
                    cluster_buffers[object_id],
                    frame_count,
                    t_frames
                )
                
                if new_label is not None and new_conf is not None:
                    cluster_labels[object_id]["label"] = new_label
                    cluster_labels[object_id]["conf"] = new_conf
                    
                    log_str = ", ".join([f"{k}: {v:.3f}" for k, v in all_conf.items()])
                    logger.info(f"[{camera_id}] GCN Output Group {object_id} -> {log_str}")
                    
                current_label = cluster_labels[object_id]["label"]
                current_conf = cluster_labels[object_id]["conf"]
                
                events.append({
                    "group_id": object_id,
                    "label": current_label,
                    "confidence": round(current_conf, 2),
                    "skeletons": absolute_skeletons
                })
                
            active_object_ids = set(tracked.values())
            for obj_id in list(cluster_buffers.keys()):
                if obj_id not in active_object_ids and obj_id not in tracker.objects:
                    del cluster_buffers[obj_id]
                    del cluster_labels[obj_id]
                    if obj_id in cluster_slot_assignment:
                        del cluster_slot_assignment[obj_id]
                    
            t_gcn = time.time()
                    
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
            
            t_transmit = time.time()
            
            if frame_count % 15 == 0:
                logger.info(f"[{camera_id}] PROFILE (ms) - Camera: {(t_read-t_start)*1000:.1f} | Resize: {(t_resize-t_read)*1000:.1f} | YOLO: {(t_yolo-t_resize)*1000:.1f} | GNN+Tracker: {(t_gcn-t_yolo)*1000:.1f} | TX/Network: {(t_transmit-t_gcn)*1000:.1f}")
                
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
