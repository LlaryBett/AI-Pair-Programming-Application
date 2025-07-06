const PROFANITY_FILTER = ["badword1", "badword2"]; // Add actual list

export const validatePrompt = (req, res, next) => {
  const { prompt } = req.body;
  
  // Validation Checks
  if (!prompt?.trim()) return res.status(400).json({
    error: "Prompt cannot be empty",
    errorCode: "EMPTY_PROMPT"
  });

  if (prompt.length < 3) return res.status(400).json({
    error: "Prompt too short (min 3 chars)",
    errorCode: "PROMPT_TOO_SHORT"
  });

  if (prompt.length > 10000) return res.status(400).json({
    error: "Prompt exceeds 10000 characters",
    errorCode: "PROMPT_TOO_LONG"
  });

  if (PROFANITY_FILTER.some(word => prompt.toLowerCase().includes(word))) {
    return res.status(400).json({
      error: "Prompt contains blocked content",
      errorCode: "PROMPT_BLOCKED"
    });
  }

  // Attach metadata for controllers
  req.promptMeta = {
    length: prompt.length,
    timestamp: new Date()
  };

  next();
};