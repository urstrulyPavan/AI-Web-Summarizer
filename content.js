// ==========================================
// 1. DOM Parsing & Speed Measurement Engine
// ==========================================
function parsePageText() {
  const startTime = performance.now();

  // Extract raw body text
  const pageText = document.body.innerText || "";
  
  // Clean and count words
  const wordsArray = pageText.trim().split(/\s+/).filter(word => word.length > 0);
  const totalWords = wordsArray.length;

  // Extract readable text blocks (paragraphs, headers, list items)
  const paragraphElements = Array.from(document.querySelectorAll('p, h2, h3, li'));
  const cleanParagraphs = [];

  for (let i = 0; i < paragraphElements.length; i++) {
    const text = paragraphElements[i].innerText.trim();
    // Exclude cookie notices, short UI elements, and nav fragments
    if (text.length > 35 && !text.includes('Cookie') && !text.includes('Privacy')) {
      cleanParagraphs.push(text);
    }
  }

  // Take top 25 text blocks to send to Gemini API (keeps payload concise)
  const extractedText = cleanParagraphs.slice(0, 25).join('\n\n');

  // Measure execution speed of DOM extraction
  const endTime = performance.now();
  const timeTakenSeconds = (endTime - startTime) / 1000;
  const wordsPerSecond = Math.round(totalWords / (timeTakenSeconds || 0.001));

  return {
    totalWords: totalWords,
    wordsPerSecond: wordsPerSecond,
    timeTakenMs: Math.round(timeTakenSeconds * 1000),
    extractedText: extractedText
  };
}

// ==========================================
// 2. Gemini AI Integration Module
// ==========================================
async function fetchAIResults(textToProcess) {
  // Read key loaded globally from config.js
  const apiKey = typeof CONFIG !== "undefined" ? CONFIG.GEMINI_API_KEY : "";

  if (!apiKey || apiKey === "YOUR_ACTUAL_GEMINI_API_KEY_HERE") {
    return {
      summary: "Error: Missing API key. Please configure your API key inside config.js.",
      quiz: []
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `
  Analyze the following web page content and perform two tasks:
  1. Provide a clear, high-level summary (2 to 3 sentences).
  2. Generate 5-8 practical, practical comprehension Q&As to help a learner master the core concepts.

  Return ONLY a raw, valid JSON object matching this exact structure:
  {
    "summary": "Concise summary here...",
    "quiz": [
      {
        "id": 1,
        "question": "What is ...?",
        "answer": "Detailed answer..."
      }
    ]
  }

  Content to analyze:
  ${textToProcess}
  `;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error("Gemini API Error details:", data.error);
      return {
        summary: `API Error: ${data.error.message}`,
        quiz: []
      };
    }

    const jsonString = data.candidates[0].content.parts[0].text;
    return JSON.parse(jsonString);

  } catch (error) {
    console.error("Gemini Request Failed:", error);
    return {
      summary: "Failed to generate AI content. Check your internet connection or API setup.",
      quiz: []
    };
  }
}

// ==========================================
// 3. Chrome Message Handler
// ==========================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "RUN_SUMMARIZE") {
    
    // Step A: Parse local page content & measure speed
    const parsedData = parsePageText();

    // Step B: Send page content to Gemini AI
    fetchAIResults(parsedData.extractedText).then(aiResults => {
      sendResponse({
        totalWords: parsedData.totalWords,
        wordsPerSecond: parsedData.wordsPerSecond,
        timeTakenMs: parsedData.timeTakenMs,
        summary: aiResults.summary,
        quiz: aiResults.quiz
      });
    });
  }
  return true; // Keep message channel open for asynchronous response
});