import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// Initialize the Google Gen AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Define your primary stable model and your high-congestion fallback model
const PRIMARY_MODEL = "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-3.1-flash-lite";

const primaryModelInstance = genAI.getGenerativeModel({ model: PRIMARY_MODEL });
const fallbackModelInstance = genAI.getGenerativeModel({ model: FALLBACK_MODEL });

app.get("/", (req, res) => {
    res.json({
        status: "success",
        message: "AI Web Summarizer API is running"
    });
});

app.post("/summarize", async (req, res) => {
    try {
        const { text } = req.body;

        if (!text) {
            return res.status(400).json({
                error: "No text provided"
            });
        }

        console.log("Text length to summarize:", text.length);

        const prompt = "Summarize this text:\n" + text;

        /**
         * Helper function to try generating content with exponential backoff retries.
         * Automatically falls back to a secondary model if the primary model continues to fail.
         */
        const generateContentWithFallback = async (modelInstance, isPrimary = true, retries = 3, delay = 1000) => {
            try {
                return await modelInstance.generateContent(prompt);
            } catch (error) {
                const currentModelName = isPrimary ? PRIMARY_MODEL : FALLBACK_MODEL;
                
                // If it's a 4xx Client Error (e.g., bad API key, blocked content), don't retry
                if (error.status && error.status >= 400 && error.status < 500) {
                    throw error;
                }

                // If we have retries left for the current model, wait and try again
                if (retries > 0) {
                    console.warn(`[${currentModelName}] API busy or unavailable (Status ${error.status}). Retrying in ${delay}ms... (${retries} left)`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return generateContentWithFallback(modelInstance, isPrimary, retries - 1, delay * 2);
                }

                // If the primary model failed all retries, switch over to the fallback model
                if (isPrimary) {
                    console.error(`[${PRIMARY_MODEL}] Exhausted all retries. Dropping down to fallback model: ${FALLBACK_MODEL}...`);
                    return generateContentWithFallback(fallbackModelInstance, false, 2, 1000);
                }

                // If even the fallback model fails all retries, bubble up the error
                throw error;
            }
        };

        // Run our resilient generation logic
        const result = await generateContentWithFallback(primaryModelInstance, true);
        const summary = result.response.text();

        res.json({
            summary: summary
        });

    } catch (error) {
        console.error("FINAL SERVER ERROR:");
        console.error(error);

        // Normalize the error status code for the Express client response
        const statusCode = error.status || 500;
        res.status(statusCode).json({
            error: error.message || "An unexpected error occurred on the AI backend."
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log("Server running on port", PORT);
});