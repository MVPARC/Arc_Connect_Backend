const { GoogleGenerativeAI } = require("@google/generative-ai");
const ArcDeckAnalysis = require("../model/arcDeckAnalysis");

// Get API key from environment variables
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");

const ANALYSIS_PROMPT = `You are a pitch deck analyzer. Analyze this pitch deck and provide detailed feedback including slide-by-slide analysis. Return EXACTLY this JSON structure:
{
  "overallScore": <0-100>,
  "categoryScores": {
    "content": <0-100>,
    "market": <0-100>,
    "business": <0-100>,
    "team": <0-100>,
    "financials": <0-100>,
    "design": <0-100>
  },
  "slideAnalysis": [
    {
      "slideNumber": <number>,
      "title": <string>,
      "metrics": {
        "spelling": <0-100>,
        "structure": <0-100>,
        "clarity": <0-100>,
        "overall": <0-100>
      },
      "feedback": [
        <array of strings with feedback>
      ],
      "suggestions": [
        <array of strings with suggestions>
      ],
      "grammarIssues": [
        <array of strings with grammar issues>
      ]
    }
  ],
  "feedback": {
    "strengths": [<array of strings>],
    "improvements": [<array of strings>],
    "criticalIssues": [<array of strings>]
  },
  "investmentAnalysis": {
    "marketOpportunity": <string>,
    "competitiveAdvantage": <string>,
    "growthPotential": <string>,
    "risks": [<array of strings>]
  },
  "detailedReport": <string>
}`;

// JSON preprocessing function
function preprocessJsonResponse(text) {
  try {
    let processed = text;
    processed = processed.replace(/```json\s*|\s*```/g, "");

    const start = processed.indexOf("{");
    const end = processed.lastIndexOf("}");

    if (start === -1 || end === -1) {
      throw new Error("No JSON object found in text");
    }

    processed = processed.slice(start, end + 1);
    processed = processed.replace(/\n/g, " ").replace(/\s+/g, " ");

    processed = processed
      .replace(/,\s*}/g, "}")
      .replace(/,\s*]/g, "]")
      .replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
      .replace(/"([^"]*)":\s*"([^"]*)"\s*([,}])/g, '"$1":"$2"$3')
      .replace(/([{,])\s*"[^"]*":\s*undefined\s*([,}])/g, "$1$2")
      .replace(/,\s*,/g, ",")
      .replace(/\[\s*,/g, "[")
      .replace(/,\s*\]/g, "]")
      .replace(/:\s*'([^']*)'/g, ':"$1"')
      .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

    JSON.parse(processed); // Validate JSON
    return processed;
  } catch (error) {
    console.error("Error preprocessing JSON:", error);
    throw error;
  }
}

function createDefaultAnalysis() {
  return {
    overallScore: 60,
    categoryScores: {
      content: 60,
      market: 60,
      business: 60,
      team: 60,
      financials: 60,
      design: 60,
    },
    slideAnalysis: [
      {
        slideNumber: 1,
        title: "Title Slide",
        metrics: {
          spelling: 60,
          structure: 60,
          clarity: 60,
          overall: 60,
        },
        feedback: ["Analysis pending"],
        suggestions: ["Upload deck for analysis"],
        grammarIssues: [],
      },
    ],
    feedback: {
      strengths: ["Potential identified"],
      improvements: ["Details needed"],
      criticalIssues: ["Review recommended"],
    },
    investmentAnalysis: {
      marketOpportunity: "Market size to be determined",
      competitiveAdvantage: "Analysis needed",
      growthPotential: "To be assessed",
      risks: ["Further validation required"],
    },
    detailedReport: "Analysis pending...",
  };
}

const arcDeckController = {
  analyzeDocument: async (req, res) => {
    try {
      const { pdfContent, fileName, fileSize, mimeType } = req.body;
      const userId = req.user._id;

      if (!pdfContent || !fileName) {
        return res.status(400).json({
          error: "PDF content and filename are required",
        });
      }

      if (!API_KEY) {
        throw new Error("Gemini API key not configured");
      }

      // Initialize Gemini model
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      // Generate content using the model
      const result = await model.generateContent([
        {
          inlineData: {
            data: pdfContent,
            mimeType,
          },
        },
        { text: ANALYSIS_PROMPT },
      ]);

      const responseText = result.response.text();
      console.log("Raw response:", responseText);

      const processedJson = preprocessJsonResponse(responseText);
      console.log("Processed JSON:", processedJson);

      const analysisResult = JSON.parse(processedJson);

      // Calculate overall score based on category scores
      const categoryScores = analysisResult.categoryScores;
      const overallScore = Math.round(
        Object.values(categoryScores).reduce((a, b) => a + b, 0) /
          Object.keys(categoryScores).length
      );

      // Create and save analysis
      const analysis = new ArcDeckAnalysis({
        userId,
        fileName,
        fileSize,
        mimeType,
        analysisResult,
        overallScore,
      });

      await analysis.save();

      res.status(200).json({
        message: "Analysis completed successfully",
        analysis: {
          id: analysis._id,
          fileName: analysis.fileName,
          overallScore: analysis.overallScore,
          createdAt: analysis.createdAt,
          analysisResult: analysis.analysisResult,
        },
      });
    } catch (error) {
      console.error("PDF Analysis error:", error);

      // Create default analysis if Gemini fails
      const defaultAnalysis = createDefaultAnalysis();

      res.status(500).json({
        error: "Failed to analyze document",
        details: error.response?.data || error.message,
        defaultAnalysis,
      });
    }
  },

  getUserAnalyses: async (req, res) => {
    try {
      const userId = req.user._id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const analyses = await ArcDeckAnalysis.find({ userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select("fileName overallScore createdAt");

      const total = await ArcDeckAnalysis.countDocuments({ userId });

      res.json({
        analyses,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: limit,
        },
      });
    } catch (error) {
      console.error("Get user analyses error:", error);
      res.status(500).json({
        error: "Failed to fetch analyses",
        details: error.message,
      });
    }
  },

  getAnalysisById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const analysis = await ArcDeckAnalysis.findOne({
        _id: id,
        userId,
      }).select("+analysisResult");

      if (!analysis) {
        return res.status(404).json({
          error: "Analysis not found",
        });
      }

      res.json({ analysis });
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({
        error: "Failed to fetch analysis",
        details: error.message,
      });
    }
  },
};

module.exports = arcDeckController;
