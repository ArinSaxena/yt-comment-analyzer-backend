import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YOUTUBE_API_KEY,
});

const fetchLatestCommentsFromYT = async (videoId) => {
  try {
    console.log("Fetching latest comments for video ID:", videoId);

    let allComments = [];
    let nextPageToken = null;
    let pageCount = 0; 

    do {
      const response = await youtube.commentThreads.list({
        part: ["snippet"],
        videoId: videoId.trim(),
        maxResults: 5, 
        order: "time",
        pageToken: nextPageToken,
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error("No comments found or the video might be private.");
      }

      const comments = response.data.items.map((item) => ({
        author: item.snippet.topLevelComment.snippet.authorDisplayName,
        text: item.snippet.topLevelComment.snippet.textDisplay,
        publishedAt: item.snippet.topLevelComment.snippet.publishedAt,
        videoId,
        commentId: item.snippet.topLevelComment.id,
      }));

      allComments.push(...comments);
      nextPageToken = response.data.nextPageToken || null;
      pageCount++;

      if (allComments.length >= 100 || pageCount >= 5) break;
    } while (nextPageToken);

    console.log(`Fetched ${allComments.length} comments.`);
    return allComments;
  } catch (err) {
    console.error("Error fetching latest comments:", err.response?.data || err.message);
    throw new Error(`Failed to fetch latest comments: ${err.message}`);
  }
};

export { fetchLatestCommentsFromYT };
