// functions/index.js
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Admin SDK
initializeApp();
const db = getFirestore();

/**
 * Trigger: when a new file is uploaded to Firebase Storage
 * Example: "models/MA-00001.glb"
 */
exports.updateProductModelUrl = onObjectFinalized(
  { region: "asia-southeast1" }, // ✅ match bucket region
  async (event) => {
    try {
      const filePath = event.data.name; // storage path, e.g. "models/MA-00001.glb"
      if (!filePath) return;

      // Only process GLB files in "models/"
      if (!filePath.endsWith(".glb") || !filePath.startsWith("models/")) return;

      // Extract productId → "MA-00001"
      const productId = filePath.split("/")[1].replace(".glb", "");

      // Build the public download URL
      const bucketName = event.data.bucket;
      const modelUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filePath)}?alt=media`;

      // Find the Firestore document with this productId
      const snapshot = await db.collection("products")
        .where("productId", "==", productId)
        .get();

      if (snapshot.empty) {
        console.log(`⚠️ No product found with productId: ${productId}`);
        return;
      }

      // Update each matching doc with the modelUrl
      const updates = [];
      snapshot.forEach((doc) => {
        updates.push(doc.ref.update({ modelUrl }));
      });
      await Promise.all(updates);

      console.log(`✅ Updated product ${productId} with modelUrl: ${modelUrl}`);
    } catch (error) {
      console.error("❌ Error updating product modelUrl:", error);
    }
  }
);
