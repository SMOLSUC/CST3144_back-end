require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_URI; 
const client = new MongoClient(uri);
const dbName = process.env.DB_NAME;
let lessonsCollection, ordersCollection;

//Middleware logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Connect to MongoDB
async function connectDB() {
  try {
    await client.connect();
    const db = client.db(dbName);
    lessonsCollection = db.collection("lessons");
    ordersCollection = db.collection("orders");
    console.log(`✅ Connected to MongoDB database: ${dbName}`);

    // Start server only when DB is ready
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error("❌ Database connection error:", err);
  }
}
connectDB();

app.get("/", (req, res) => {
  res.send("Backend is running");
});

// Get all lessons
app.get("/api/lessons", async (req, res) => {
  try {
    const lessons = await lessonsCollection.find().toArray();
    res.json(lessons);
  } catch (err) {
    console.error("❌ Error fetching lessons:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add a new lesson
app.post("/api/lessons", async (req, res) => {
  try {
    const {
      topic,
      price,
      location,
      space,
      category,
      level,
      duration,
      image,
      preview,
      subject,
    } = req.body;

    // Basic validation (optional but recommended)
    if (!topic || !price || !location || !space || !category || !level || !duration || !image || !preview || !subject) {
      return res.status(400).json({ message: "Missing required lesson fields" });
    }

    const newLesson = {
      topic,
      price,
      location,
      space,
      category,
      level,
      duration,
      image,
      preview,
      subject,
    };

    const result = await lessonsCollection.insertOne(newLesson);

    res.status(201).json({
      message: "Lesson added successfully",
      lessonId: result.insertedId,
    });

  } catch (err) {
    console.error("❌ Error adding lesson:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Update any attribute(s) of a lesson
app.put("/api/lessons/:id", async (req, res) => {
  try {
    const lessonId = req.params.id;
    const updates = req.body; // fields to update

    // Ensure request body is not empty
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields provided to update" });
    }

    const result = await lessonsCollection.updateOne(
      { _id: new ObjectId(lessonId) },
      { $set: updates }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    res.json({ message: "Lesson updated successfully" });

  } catch (err) {
    console.error("❌ Error updating lesson:", err);
    res.status(500).json({ message: "Server error" });
  }
});



// Add a new order
app.post("/api/orders", async (req, res) => {
  try {
    const order = req.body;
    await ordersCollection.insertOne(order);
    res.status(201).json({ message: "Order saved successfully" });
  } catch (err) {
    console.error("❌ Error saving order:", err);
    res.status(400).json({ message: "Insert failed" });
  }
});

const { ObjectId } = require("mongodb");

// Decrease lesson space by 1
app.put("/api/lessons/:id/decrement", async (req, res) => {
  try {
    const lessonId = req.params.id;

    // Check if lesson exists and has available space
    const lesson = await lessonsCollection.findOne({ _id: new ObjectId(lessonId) });
    if (!lesson) {
      return res.status(404).json({ message: "Lesson not found" });
    }

    if (lesson.space <= 0) {
      return res.status(400).json({ message: "No spaces left for this lesson" });
    }

    // Decrement the space by 1
    const result = await lessonsCollection.updateOne(
      { _id: new ObjectId(lessonId) },
      { $inc: { space: -1 } }
    );

    if (result.modifiedCount === 1) {
      res.json({ message: "Lesson space decremented successfully" });
    } else {
      res.status(400).json({ message: "Failed to update lesson space" });
    }
  } catch (err) {
    console.error("❌ Error decrementing space:", err);
    res.status(500).json({ message: "Server error" });
  }
});


