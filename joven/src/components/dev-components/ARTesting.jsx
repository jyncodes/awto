import React, { useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import "../../styles/ARTesting.css";

const ARTesting = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const [tires, setTires] = useState([]);
  const [mags, setMags] = useState([]);
  const [selectedGLB, setSelectedGLB] = useState(null);
  const [loading, setLoading] = useState(false);

  const YOLO_API = "http://localhost:8000/infer";

  // -------------------------
  // 1. FETCH PRODUCTS
  // -------------------------
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const tiresSnap = await getDocs(collection(db, "products_tires"));
        const magsSnap = await getDocs(collection(db, "products_mags"));

        setTires(tiresSnap.docs.map((doc) => doc.data()));
        setMags(magsSnap.docs.map((doc) => doc.data()));
      } catch (e) {
        console.error("❌ Firestore fetch error:", e);
      }
    };

    fetchProducts();
  }, []);

  // -------------------------
  // 2. START CAMERA
  // -------------------------
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "environment" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e) {
      console.error("❌ Camera error:", e);
    }
  };

  // -------------------------
  // 3. CAPTURE FRAME + SEND TO YOLO
  // -------------------------
  const runYOLO = async () => {
    if (!videoRef.current) return;

    setLoading(true);

    // Draw video frame into canvas
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    // Convert to Blob
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg")
    );

    const formData = new FormData();
    formData.append("file", blob, "frame.jpg");

    try {
      const res = await fetch(YOLO_API, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      drawDetections(data.detections);
    } catch (err) {
      console.error("❌ YOLO error:", err);
    }

    setLoading(false);
  };

  // -------------------------
  // 4. DRAW YOLO DETECTIONS
  // -------------------------
  const drawDetections = (detections) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    // Redraw video frame
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    detections.forEach((det) => {
      const [x1, y1, x2, y2] = det.bbox;
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 3;
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

      ctx.fillStyle = "black";
      ctx.font = "18px Arial";
      ctx.fillText(`Class: ${det.class}`, x1, y1 - 4);
    });
  };

  // -------------------------
  // 5. HANDLE GLB TEST LOAD
  // -------------------------
  const handleTestLoad = (productId) => {
    const base = "https://ojyapkmalpnfwskpozbx.supabase.co/storage/v1/object/public/models";
    const glbPaths = [
      `${base}/${productId}.glb`,
      `${base}/${productId}.GLB`,
      `${base}/products_tires/${productId}.glb`,
      `${base}/products_tires/${productId}.GLB`,
      `${base}/products_mags/${productId}.glb`,
      `${base}/products_mags/${productId}.GLB`,
    ];

    checkPathSequence(glbPaths, 0);
  };

  const checkPathSequence = async (paths, index) => {
    if (index >= paths.length) {
      alert("⚠ No GLB found for this model.");
      return;
    }

    try {
      const res = await fetch(paths[index], { method: "HEAD" });
      if (res.ok) {
        setSelectedGLB(paths[index]);
        return;
      }
      checkPathSequence(paths, index + 1);
    } catch {
      checkPathSequence(paths, index + 1);
    }
  };

  return (
    <div className="ar-testing-container">

      {/* Camera + canvas */}
      <div className="viewer-section">
        <video ref={videoRef} className="ar-video" autoPlay muted></video>
        <canvas ref={canvasRef} className="ar-canvas"></canvas>
      </div>

      <div className="controls-row">
        <button onClick={startCamera} className="btn-start">Start Camera</button>
        <button onClick={runYOLO} className="btn-detect">
          {loading ? "Detecting..." : "Run Detection"}
        </button>
      </div>

      {/* GLB Viewer */}
      {selectedGLB && (
        <model-viewer
          src={selectedGLB}
          alt="GLB Preview"
          ar
          auto-rotate
          camera-controls
          style={{ width: "300px", height: "300px", marginTop: "1rem" }}
        ></model-viewer>
      )}

      {/* Tables */}
      <h2>Mags</h2>
      <table className="simple-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Brand</th>
            <th>Model</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {mags.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.brand}</td>
              <td>{m.model}</td>
              <td>
                <button className="btn-test" onClick={() => handleTestLoad(m.id)}>Test</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Tires</h2>
      <table className="simple-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Brand</th>
            <th>Model</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tires.map((t) => (
            <tr key={t.id}>
              <td>{t.id}</td>
              <td>{t.brand}</td>
              <td>{t.model}</td>
              <td>
                <button className="btn-test" onClick={() => handleTestLoad(t.id)}>Test</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
};

export default ARTesting;
