// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const ArcDeckAnalysis = require("../model/arcDeckAnalysis");

// // Get API key from environment variables
// const API_KEY = process.env.GEMINI_API_KEY;
// const genAI = new GoogleGenerativeAI(API_KEY || "");

// // Updated analysis prompt from frontend
// const ANALYSIS_PROMPT = `You are an expert venture capitalist and pitch deck consultant with experience evaluating thousands of startup pitch decks. Analyze this pitch deck thoroughly and provide detailed, actionable feedback that would genuinely help a startup improve their chances of securing funding.

// Focus on providing specific, actionable insights rather than generic feedback. Identify what works well, what needs improvement, and what's missing entirely. Your analysis should be candid but constructive.

// Return your analysis in EXACTLY this JSON structure:

// {
//   "overallScore": <0-100>,
//   "executiveSummary": "<1-2 paragraph overall assessment highlighting the biggest strengths and most critical improvements needed>",
//   "categoryScores": {
//     "valueProp": <0-100, score for clarity and strength of value proposition>,
//     "market": <0-100, score for market analysis and opportunity size>,
//     "product": <0-100, score for product/solution description and differentiation>,
//     "businessModel": <0-100, score for clarity and viability of business model>,
//     "goToMarket": <0-100, score for go-to-market strategy>,
//     "team": <0-100, score for team qualifications and completeness>,
//     "financials": <0-100, score for financial projections and planning>,
//     "competitiveAnalysis": <0-100, score for competitive landscape assessment>,
//     "design": <0-100, score for visual design and presentation clarity>
//   },
//   "investorPerspective": {
//     "fundability": <0-100, how likely an investor would be to fund based on this deck>,
//     "keyStrengths": [<3-5 specific aspects that would appeal to investors>],
//     "redFlags": [<3-5 specific concerns that would make investors hesitate>],
//     "criticalGaps": [<specific critical information missing from the deck>],
//     "questions": [<5-7 questions investors would immediately ask after viewing this deck>]
//   },
//   "slideAnalysis": [
//     {
//       "slideNumber": <number>,
//       "title": <slide title or description>,
//       "purpose": <what this slide aims to communicate>,
//       "score": <0-100>,
//       "strengths": [<specific positive aspects of this slide>],
//       "weaknesses": [<specific issues with this slide>],
//       "recommendations": [<specific, actionable recommendations to improve this slide>],
//       "investorImpact": <how investors would perceive this slide, positive or negative>,
//       "bestPractices": <advice on how top-tier startups handle this type of slide>
//     }
//   ],
//   "comparativeAnalysis": {
//     "industryBenchmark": <how this deck compares to industry standards>,
//     "topCompetitorsApproach": <how competing startups position similar offerings>,
//     "uniqueSellingPoints": [<what makes this startup's approach unique in the market>],
//     "marketPositioning": <assessment of the positioning strategy>
//   },
//   "financialAssessment": {
//     "revenueModelClarity": <0-100>,
//     "projectionRealism": <0-100>,
//     "unitEconomics": <assessment of the unit economics if presented>,
//     "fundingRequirements": <assessment of the funding ask and use of funds>,
//     "keyMetrics": <assessment of which metrics the company is tracking>
//   },
//   "narrativeQuality": {
//     "storyCoherence": <0-100, how well the overall story flows>,
//     "problemClarity": <0-100, how clearly the problem is defined>,
//     "solutionFit": <0-100, how well the solution addresses the stated problem>,
//     "differentiationClarity": <0-100, how clearly the differentiation is articulated>,
//     "impactCommunication": <0-100, how well potential impact is communicated>
//   },
//   "actionPlan": {
//     "immediateActions": [<3-5 specific actions to take immediately to improve the deck>],
//     "shortTermImprovements": [<3-5 improvements to make before pitching to investors>],
//     "longTermConsiderations": [<strategic considerations for future iterations>]
//   },
//   "expertInsights": [<5-7 expert insights that go beyond basic advice, drawing from venture capital experience>]
// }

// Provide exceptionally detailed, specific, and actionable feedback in each section. Do not include any explanatory text, markdown formatting, or additional content outside of this JSON structure.`;

// // JSON preprocessing function - kept the same
// function preprocessJsonResponse(text) {
//   try {
//     let processed = text;
//     processed = processed.replace(/```json\s*|\s*```/g, "");

//     const start = processed.indexOf("{");
//     const end = processed.lastIndexOf("}");

//     if (start === -1 || end === -1) {
//       throw new Error("No JSON object found in text");
//     }

//     processed = processed.slice(start, end + 1);
//     processed = processed.replace(/\n/g, " ").replace(/\s+/g, " ");

//     processed = processed
//       .replace(/,\s*}/g, "}")
//       .replace(/,\s*]/g, "]")
//       .replace(/([{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":')
//       .replace(/"([^"]*)":\s*"([^"]*)"\s*([,}])/g, '"$1":"$2"$3')
//       .replace(/([{,])\s*"[^"]*":\s*undefined\s*([,}])/g, "$1$2")
//       .replace(/,\s*,/g, ",")
//       .replace(/\[\s*,/g, "[")
//       .replace(/,\s*\]/g, "]")
//       .replace(/:\s*'([^']*)'/g, ':"$1"')
//       .replace(/[\x00-\x1F\x7F-\x9F]/g, "");

//     JSON.parse(processed); // Validate JSON
//     return processed;
//   } catch (error) {
//     console.error("Error preprocessing JSON:", error);
//     throw error;
//   }
// }

// // Updated default analysis to match the new format
// function createDefaultAnalysis() {
//   return {
//     overallScore: 60,
//     executiveSummary:
//       "Analysis pending. Please wait or try uploading your deck again.",
//     categoryScores: {
//       valueProp: 60,
//       market: 60,
//       product: 60,
//       businessModel: 60,
//       goToMarket: 60,
//       team: 60,
//       financials: 60,
//       competitiveAnalysis: 60,
//       design: 60,
//     },
//     investorPerspective: {
//       fundability: 60,
//       keyStrengths: ["Analysis pending"],
//       redFlags: ["Analysis pending"],
//       criticalGaps: ["Analysis pending"],
//       questions: ["Analysis pending"],
//     },
//     slideAnalysis: [
//       {
//         slideNumber: 1,
//         title: "Title Slide",
//         purpose: "Introduction to the company",
//         score: 60,
//         strengths: ["Analysis pending"],
//         weaknesses: ["Analysis pending"],
//         recommendations: ["Analysis pending"],
//         investorImpact: "Analysis pending",
//         bestPractices: "Analysis pending",
//       },
//     ],
//     comparativeAnalysis: {
//       industryBenchmark: "Analysis pending",
//       topCompetitorsApproach: "Analysis pending",
//       uniqueSellingPoints: ["Analysis pending"],
//       marketPositioning: "Analysis pending",
//     },
//     financialAssessment: {
//       revenueModelClarity: 60,
//       projectionRealism: 60,
//       unitEconomics: "Analysis pending",
//       fundingRequirements: "Analysis pending",
//       keyMetrics: "Analysis pending",
//     },
//     narrativeQuality: {
//       storyCoherence: 60,
//       problemClarity: 60,
//       solutionFit: 60,
//       differentiationClarity: 60,
//       impactCommunication: 60,
//     },
//     actionPlan: {
//       immediateActions: ["Analysis pending"],
//       shortTermImprovements: ["Analysis pending"],
//       longTermConsiderations: ["Analysis pending"],
//     },
//     expertInsights: ["Analysis pending"],
//   };
// }

// const arcDeckController = {
//   analyzeDocument: async (req, res) => {
//     try {
//       const { pdfContent, fileName, fileSize, mimeType, azureUrl } = req.body;

//       // Handle both authenticated and non-authenticated requests
//       let userId = null;
//       if (req.user) {
//         userId = req.user._id;
//       }

//       if (!pdfContent || !fileName) {
//         return res.status(400).json({
//           error: "PDF content and filename are required",
//         });
//       }

//       if (!API_KEY) {
//         throw new Error("Gemini API key not configured");
//       }

//       // Initialize Gemini model
//       const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

//       // Generate content using the model
//       const result = await model.generateContent([
//         {
//           inlineData: {
//             data: pdfContent,
//             mimeType,
//           },
//         },
//         { text: ANALYSIS_PROMPT },
//       ]);

//       const responseText = result.response.text();
//       console.log("Raw response:", responseText);

//       const processedJson = preprocessJsonResponse(responseText);
//       console.log("Processed JSON:", processedJson);

//       const analysisResult = JSON.parse(processedJson);

//       // Add Azure URL if provided
//       if (azureUrl) {
//         analysisResult.azureUrl = azureUrl;
//       }

//       // Save to database if authenticated
//       if (userId) {
//         // Calculate overall score based on category scores if needed
//         // (This might be redundant now as the response format already includes overall score)

//         const analysis = new ArcDeckAnalysis({
//           userId,
//           fileName,
//           fileSize,
//           mimeType,
//           analysisResult,
//           overallScore: analysisResult.overallScore,
//         });

//         await analysis.save();

//         res.status(200).json({
//           message: "Analysis completed successfully",
//           analysis: {
//             id: analysis._id,
//             fileName: analysis.fileName,
//             overallScore: analysis.overallScore,
//             createdAt: analysis.createdAt,
//             analysisResult: analysis.analysisResult,
//           },
//         });
//       } else {
//         // For non-authenticated users, just return the analysis
//         res.status(200).json({
//           message: "Analysis completed successfully",
//           analysis: {
//             fileName,
//             overallScore: analysisResult.overallScore,
//             createdAt: new Date().toISOString(),
//             analysisResult,
//           },
//         });
//       }
//     } catch (error) {
//       console.error("PDF Analysis error:", error);

//       // Create default analysis if Gemini fails
//       const defaultAnalysis = createDefaultAnalysis();

//       res.status(500).json({
//         error: "Failed to analyze document",
//         details: error.response?.data || error.message,
//         defaultAnalysis,
//       });
//     }
//   },

//   // Keep the other controller functions the same
//   getUserAnalyses: async (req, res) => {
//     try {
//       const userId = req.user._id;
//       const page = parseInt(req.query.page) || 1;
//       const limit = parseInt(req.query.limit) || 10;

//       const analyses = await ArcDeckAnalysis.find({ userId })
//         .sort({ createdAt: -1 })
//         .skip((page - 1) * limit)
//         .limit(limit)
//         .select("fileName overallScore createdAt");

//       const total = await ArcDeckAnalysis.countDocuments({ userId });

//       res.json({
//         analyses,
//         pagination: {
//           currentPage: page,
//           totalPages: Math.ceil(total / limit),
//           totalItems: total,
//           itemsPerPage: limit,
//         },
//       });
//     } catch (error) {
//       console.error("Get user analyses error:", error);
//       res.status(500).json({
//         error: "Failed to fetch analyses",
//         details: error.message,
//       });
//     }
//   },

//   getAnalysisById: async (req, res) => {
//     try {
//       const { id } = req.params;
//       const userId = req.user._id;

//       const analysis = await ArcDeckAnalysis.findOne({
//         _id: id,
//         userId,
//       }).select("+analysisResult");

//       if (!analysis) {
//         return res.status(404).json({
//           error: "Analysis not found",
//         });
//       }

//       res.json({ analysis });
//     } catch (error) {
//       console.error("Get analysis error:", error);
//       res.status(500).json({
//         error: "Failed to fetch analysis",
//         details: error.message,
//       });
//     }
//   },
// };

// module.exports = arcDeckController;

const { GoogleGenerativeAI } = require("@google/generative-ai");
const ArcDeckAnalysis = require("../model/arcDeckAnalysis");
const axios = require("axios"); // You'll need axios or node-fetch for this

// Get API key from environment variables
const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || "");

// Updated analysis prompt from frontend
const ANALYSIS_PROMPT = `You are an expert venture capitalist and pitch deck consultant with experience evaluating thousands of startup pitch decks. Analyze this pitch deck thoroughly and provide detailed, actionable feedback that would genuinely help a startup improve their chances of securing funding.

Focus on providing specific, actionable insights rather than generic feedback. Identify what works well, what needs improvement, and what's missing entirely. Your analysis should be candid but constructive.

Return your analysis in EXACTLY this JSON structure:

{
  "overallScore": <0-100>,
  "executiveSummary": "<1-2 paragraph overall assessment highlighting the biggest strengths and most critical improvements needed>",
  "categoryScores": {
    "valueProp": <0-100, score for clarity and strength of value proposition>,
    "market": <0-100, score for market analysis and opportunity size>,
    "product": <0-100, score for product/solution description and differentiation>,
    "businessModel": <0-100, score for clarity and viability of business model>,
    "goToMarket": <0-100, score for go-to-market strategy>,
    "team": <0-100, score for team qualifications and completeness>,
    "financials": <0-100, score for financial projections and planning>,
    "competitiveAnalysis": <0-100, score for competitive landscape assessment>,
    "design": <0-100, score for visual design and presentation clarity>
  },
  "investorPerspective": {
    "fundability": <0-100, how likely an investor would be to fund based on this deck>,
    "keyStrengths": [<3-5 specific aspects that would appeal to investors>],
    "redFlags": [<3-5 specific concerns that would make investors hesitate>],
    "criticalGaps": [<specific critical information missing from the deck>],
    "questions": [<5-7 questions investors would immediately ask after viewing this deck>]
  },
  "slideAnalysis": [
    {
      "slideNumber": <number>,
      "title": <slide title or description>,
      "purpose": <what this slide aims to communicate>,
      "score": <0-100>,
      "strengths": [<specific positive aspects of this slide>],
      "weaknesses": [<specific issues with this slide>],
      "recommendations": [<specific, actionable recommendations to improve this slide>],
      "investorImpact": <how investors would perceive this slide, positive or negative>,
      "bestPractices": <advice on how top-tier startups handle this type of slide>
    }
  ],
  "comparativeAnalysis": {
    "industryBenchmark": <how this deck compares to industry standards>,
    "topCompetitorsApproach": <how competing startups position similar offerings>,
    "uniqueSellingPoints": [<what makes this startup's approach unique in the market>],
    "marketPositioning": <assessment of the positioning strategy>
  },
  "financialAssessment": {
    "revenueModelClarity": <0-100>,
    "projectionRealism": <0-100>,
    "unitEconomics": <assessment of the unit economics if presented>,
    "fundingRequirements": <assessment of the funding ask and use of funds>,
    "keyMetrics": <assessment of which metrics the company is tracking>
  },
  "narrativeQuality": {
    "storyCoherence": <0-100, how well the overall story flows>,
    "problemClarity": <0-100, how clearly the problem is defined>,
    "solutionFit": <0-100, how well the solution addresses the stated problem>,
    "differentiationClarity": <0-100, how clearly the differentiation is articulated>,
    "impactCommunication": <0-100, how well potential impact is communicated>
  },
  "actionPlan": {
    "immediateActions": [<3-5 specific actions to take immediately to improve the deck>],
    "shortTermImprovements": [<3-5 improvements to make before pitching to investors>],
    "longTermConsiderations": [<strategic considerations for future iterations>]
  },
  "expertInsights": [<5-7 expert insights that go beyond basic advice, drawing from venture capital experience>]
}

Provide exceptionally detailed, specific, and actionable feedback in each section. Do not include any explanatory text, markdown formatting, or additional content outside of this JSON structure.`;

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

// Updated default analysis to match the new format
function createDefaultAnalysis() {
  return {
    overallScore: 60,
    executiveSummary:
      "Analysis pending. Please wait or try uploading your deck again.",
    categoryScores: {
      valueProp: 60,
      market: 60,
      product: 60,
      businessModel: 60,
      goToMarket: 60,
      team: 60,
      financials: 60,
      competitiveAnalysis: 60,
      design: 60,
    },
    investorPerspective: {
      fundability: 60,
      keyStrengths: ["Analysis pending"],
      redFlags: ["Analysis pending"],
      criticalGaps: ["Analysis pending"],
      questions: ["Analysis pending"],
    },
    slideAnalysis: [
      {
        slideNumber: 1,
        title: "Title Slide",
        purpose: "Introduction to the company",
        score: 60,
        strengths: ["Analysis pending"],
        weaknesses: ["Analysis pending"],
        recommendations: ["Analysis pending"],
        investorImpact: "Analysis pending",
        bestPractices: "Analysis pending",
      },
    ],
    comparativeAnalysis: {
      industryBenchmark: "Analysis pending",
      topCompetitorsApproach: "Analysis pending",
      uniqueSellingPoints: ["Analysis pending"],
      marketPositioning: "Analysis pending",
    },
    financialAssessment: {
      revenueModelClarity: 60,
      projectionRealism: 60,
      unitEconomics: "Analysis pending",
      fundingRequirements: "Analysis pending",
      keyMetrics: "Analysis pending",
    },
    narrativeQuality: {
      storyCoherence: 60,
      problemClarity: 60,
      solutionFit: 60,
      differentiationClarity: 60,
      impactCommunication: 60,
    },
    actionPlan: {
      immediateActions: ["Analysis pending"],
      shortTermImprovements: ["Analysis pending"],
      longTermConsiderations: ["Analysis pending"],
    },
    expertInsights: ["Analysis pending"],
  };
}

const arcDeckController = {
  analyzeDocument: async (req, res) => {
    try {
      const { azureUrl, fileName, fileSize, mimeType } = req.body;

      // Handle both authenticated and non-authenticated requests
      let userId = null;
      if (req.user) {
        userId = req.user._id;
      }

      if (!azureUrl || !fileName) {
        return res.status(400).json({
          error: "Azure URL and filename are required",
        });
      }

      if (!API_KEY) {
        throw new Error("Gemini API key not configured");
      }

      // Fetch the file directly from Azure
      console.log("Fetching file from Azure:", azureUrl);
      const fileResponse = await axios.get(azureUrl, {
        responseType: "arraybuffer",
      });

      // Convert the file to base64
      const base64Data = Buffer.from(fileResponse.data).toString("base64");

      // Initialize Gemini model
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

      // Generate content using the model
      const result = await model.generateContent([
        {
          inlineData: {
            data: base64Data,
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

      // Add Azure URL to the result
      analysisResult.azureUrl = azureUrl;

      // Save to database if authenticated
      if (userId) {
        // Calculate overall score if needed
        const analysis = new ArcDeckAnalysis({
          userId,
          fileName,
          fileSize,
          mimeType,
          analysisResult,
          overallScore: analysisResult.overallScore,
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
      } else {
        // For non-authenticated users, just return the analysis
        res.status(200).json({
          message: "Analysis completed successfully",
          analysis: {
            fileName,
            overallScore: analysisResult.overallScore,
            createdAt: new Date().toISOString(),
            analysisResult,
          },
        });
      }
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
