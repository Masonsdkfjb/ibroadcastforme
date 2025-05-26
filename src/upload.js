const admin = require("firebase-admin");
const fs = require("fs");
const csv = require("csv-parser");

const serviceAccount = require("./YOUR_SERVICE_ACCOUNT_KEY.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

fs.createReadStream("Audiobook Spreadsheet - Sheet1.csv")
  .pipe(csv())
  .on("data", async (row) => {
    try {
      await db.collection("audiobooks").add(row);
      console.log("Uploaded:", row.title || row);
    } catch (error) {
      console.error("Error uploading row:", error);
    }
  })
  .on("end", () => {
    console.log("CSV upload complete.");
  });
