import React from "react";
import ARSmartViewer from "../../components/user-components/ARSmartViewer";

export default function DebugARViewer() {
  return (
    <div style={{ width: "100%", height: "100vh", background: "black" }}>
      <ARSmartViewer src="/models/test.glb" />
    </div>
  );
}
