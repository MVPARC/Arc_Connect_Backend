const axios = require("axios");
const ArcDeckAnalysis = require("../model/arcDeckAnalysis");

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent";

const arcDeckController = {
  analyzeDocument: async (req, res) => {
    try {
      const { pdfContent, fileName, fileSize, mimeType } = req.body;
      const userId = req.user._id; // From auth middleware

      // Validate input
      if (!pdfContent || !fileName) {
        return res
          .status(400)
          .json({ error: "PDF content and filename are required" });
      }

      // Configuration for Gemini API
      const config = {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.GEMINI_API_KEY}`,
        },
      };

      // Prepare payload for Gemini API
      const payload = {
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: pdfContent, // Base64 encoded PDF content
                },
              },
            ],
            role: "user",
          },
        ],
        generationConfig: {},
        safetySettings: [],
      };

      // Call Gemini API
      const geminiResponse = await axios.post(GEMINI_API_URL, payload, config);

      // Extract relevant information from Gemini response
      const analysisResult = geminiResponse.data;

      // Calculate overall score (you may need to adjust this based on your requirements)
      const overallScore = 20; // Example score, modify based on your logic

      // Create new analysis record
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
      res.status(500).json({
        error: "Failed to analyze document",
        details: error.response?.data || error.message,
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
        .select("-analysisResult"); // Exclude large analysis result by default

      const total = await ArcDeckAnalysis.countDocuments({ userId });

      res.json({
        analyses,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      });
    } catch (error) {
      console.error("Get user analyses error:", error);
      res.status(500).json({ error: "Failed to fetch analyses" });
    }
  },

  getAnalysisById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const analysis = await ArcDeckAnalysis.findOne({
        _id: id,
        userId,
      });

      if (!analysis) {
        return res.status(404).json({ error: "Analysis not found" });
      }

      res.json({ analysis });
    } catch (error) {
      console.error("Get analysis error:", error);
      res.status(500).json({ error: "Failed to fetch analysis" });
    }
  },
};

module.exports = arcDeckController;
