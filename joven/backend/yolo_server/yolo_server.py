import io
import os
from typing import List, Dict, Any

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
import uvicorn

from ultralytics import YOLO

# -----------------------------------
# FASTAPI APP
# -----------------------------------
app = FastAPI(title="YOLOv8 Detection Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "https://superofficiously-untraditional-shan.ngrok-free.dev",
        "http://192.168.1.6:5173",
        "http://192.168.1.8:5173"

    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------
# MODEL LOADING
# -----------------------------------
MODEL_PATH = "wheel_detector.pt"  # rename best.pt → wheel_detector.pt
DEVICE = "cpu"

print(f"Loading YOLO model from: {MODEL_PATH}")
model = YOLO(MODEL_PATH)


# -----------------------------------
# INFERENCE ENDPOINT
# -----------------------------------
@app.post("/infer")
async def infer(file: UploadFile = File(...)):
    # Validate file
    if file.content_type.split("/")[0] != "image":
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    # Read image
    try:
        img_bytes = await file.read()
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid image file.")

    img_np = np.array(img)
    img_h, img_w = img_np.shape[:2]

    # Run YOLO inference
    try:
        results = model.predict(
            source=img_np,
            imgsz=640,
            conf=0.25,
            iou=0.45,
            device=DEVICE,
            verbose=False
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")

    result = results[0]
    detections: List[Dict[str, Any]] = []

    boxes = result.boxes
    names = result.names

    if boxes is not None and len(boxes) > 0:
        xyxy = boxes.xyxy.cpu().numpy()
        confs = boxes.conf.cpu().numpy()
        cls_ids = boxes.cls.cpu().numpy().astype(int)

        for box, conf, cls_id in zip(xyxy, confs, cls_ids):
            x1, y1, x2, y2 = [float(v) for v in box]

            detections.append({
                "bbox": [x1, y1, x2, y2],
                "confidence": float(conf),
                "class_id": int(cls_id),
                "class": names.get(int(cls_id), str(int(cls_id))),
            })

    return {
        "image_width": img_w,
        "image_height": img_h,
        "detections": detections,
    }


# -----------------------------------
# RUN SERVER
# -----------------------------------
if __name__ == "__main__":
    uvicorn.run("yolo_server:app", host="0.0.0.0", port=8000, reload=True)
