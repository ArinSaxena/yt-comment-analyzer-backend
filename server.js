import { getSentiment } from "./GeminiService.js";
import {
  fetchCommentsFromDB,
  updateCommentSentiment,
  getSentimentFromDB,
} from "./db.js";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
  })
);

const extractVideoId = (url) => {
  try {
    const urlObj = new URL(url);
    const videoId =
      urlObj.searchParams.get("v") ||
      url.replace("https://youtu.be/", "").split("?")[0];
    if (!videoId) {
      throw new Error("No video ID found in URL");
    }
    return videoId;
  } catch (error) {
    throw new Error("Invalid YouTube URL format");
  }
};

app.post("/api/analyze", async (req, res) => {
  try {
    const { videoUrl } = req.body;
    if (!videoUrl) {
      return res.status(400).json({ error: "Video URL is required" });
    }

    const videoId = extractVideoId(videoUrl);
    console.log("Analyzing video:", videoId);

    const comments = await fetchCommentsFromDB(videoId);
    console.log(`Processing ${comments.length} comments`);

    const sentiments = {
      positive: 0,
      negative: 0,
      neutral: 0,
    };

    const commentsToAnalyze = comments.slice(0, 20);
    let analyzedCount = 0;

    for (const comment of commentsToAnalyze) {
      try {
        let sentiment = await getSentimentFromDB(comment.commentId);

        if (!sentiment) {
          console.log(
            `No cached sentiment for ${comment.commentId}, calling Gemini...`
          );
          sentiment = await getSentiment(comment.text);
          await updateCommentSentiment(comment.commentId, sentiment);
        } else {
          console.log(
            `Using cached sentiment for ${comment.commentId}: ${sentiment}`
          );
        }

        if (["positive", "negative", "neutral"].includes(sentiment)) {
          sentiments[sentiment]++;
          analyzedCount++;
        } else {
          console.warn(`Unexpected sentiment value: ${sentiment}`);
        }
      } catch (error) {
        console.error("Error analyzing comment:", comment.commentId, error);
        continue;
      }
    }

    if (analyzedCount === 0) {
      throw new Error("No comments were successfully analyzed");
    }

    const result = {
      positive: ((sentiments.positive / analyzedCount) * 100).toFixed(1),
      negative: ((sentiments.negative / analyzedCount) * 100).toFixed(1),
      neutral: ((sentiments.neutral / analyzedCount) * 100).toFixed(1),
      totalComments: analyzedCount,
    };

    console.log("Analysis results:", result);
    res.json(result);
  } catch (error) {
    console.error("Error analyzing comments:", error);
    res.status(500).json({
      error: "Failed to analyze comments",
      message: error.message,
    });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something broke!",
    message: err.message,
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
