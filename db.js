import dotenv from "dotenv";
import mongoose from "mongoose";
import { fetchLatestCommentsFromYT } from "./ytService.js";

dotenv.config();

const uri = process.env.MONGO_URI;
if (!uri) {
  throw new Error("MongoDB URI is not defined in environment variables");
}

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));

const commentSchema = new mongoose.Schema({
  commentId: { type: String, required: true, unique: true },
  videoId: { type: String, required: true },
  text: { type: String, required: true },
  sentiment: { type: String, enum: ["positive", "negative", "neutral"]},
  analyzedAt: { type: Date },
}, { timestamps: true });

const Comment = mongoose.model("Comment", commentSchema);

const storeCommentsInDB = async (comments) => {
  try {
    await Comment.insertMany(comments, { ordered: false });
    console.log("Comments stored in MongoDB");
  } catch (error) {
    console.error("Error storing comments:", error);
    throw error;
  }
};

const fetchCommentsFromDB = async (videoId) => {
  try {
    let comments = await Comment.find({ videoId });
    
    if (comments.length === 0) {
      console.log("No comments found in DB, fetching from YouTube...");
      comments = await fetchLatestCommentsFromYT(videoId);
      if (comments && comments.length > 0) {
        await storeCommentsInDB(comments);
      }
    }

    if (!comments || comments.length === 0) {
      throw new Error("No comments found for this video");
    }

    return comments;
  } catch (error) {
    console.error("Error fetching comments:", error);
    throw error;
  }
};

const getSentimentFromDB = async (commentId) => {
  try {
    const comment = await Comment.findOne({ commentId }, "sentiment");
    return comment?.sentiment || null;
  } catch (error) {
    console.error("Error fetching sentiment:", error);
    throw error;
  }
};

const updateCommentSentiment = async (commentId, sentiment) => {
  try {
    await Comment.updateOne({ commentId }, { $set: { sentiment, analyzedAt: new Date() } });
    console.log(`Updated sentiment for comment ${commentId}`);
  } catch (error) {
    console.error("Error updating comment sentiment:", error);
    throw error;
  }
};

export { storeCommentsInDB, fetchCommentsFromDB, updateCommentSentiment, getSentimentFromDB };
