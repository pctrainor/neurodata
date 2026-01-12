# Model Input-Output Scenarios for NeuroData Hub

This document provides comprehensive input-output examples for neuroscience, education, and content analysis workflows. Use these scenarios for LLM prompt engineering, model training, and developer onboarding.

---

## Scenario 1: Student Brain Pattern Analysis (10 Students)

**Prompt:**
> Analyze 10 students taking a math test. Include brain pattern metrics for each student and summarize environmental impacts (noise, lighting, stress).

**Workflow Nodes:**
- 10 student nodes
- 3 environment nodes (noise, lighting, stress)

**Expected Output:**
```json
{
  "success": true,
  "execution": {
    "executionId": "abc123",
    "workflowName": "Student Brain Pattern Analysis",
    "status": "completed",
    "content": {
      "url": "",
      "title": "Math Test",
      "platform": "custom"
    },
    "overallScore": 82.5,
    "viralPotential": "low",
    "nodeStats": {
      "total": 10,
      "completed": 10,
      "failed": 0
    },
    "aggregatedMetrics": {
      "avgEngagement": 78.2,
      "avgAttention": 80.1,
      "avgEmotionalIntensity": 65.4,
      "shareRate": 0,
      "purchaseRate": 0,
      "topEmotion": "focus"
    },
    "executionTimeMs": 1200,
    "creditsUsed": 10,
    "timestamps": {
      "started": "2026-01-11T10:00:00Z",
      "completed": "2026-01-11T10:00:01Z"
    }
  },
  "nodes": [
    {
      "nodeId": "student-1",
      "nodeType": "student",
      "nodeLabel": "Student 1",
      "demographicId": "gen-z-18-24",
      "demographicTraits": ["high stress", "low noise tolerance"],
      "personaCategory": "age",
      "scores": {
        "engagement": 80,
        "attention": 85,
        "emotionalIntensity": 60,
        "memoryEncoding": 75,
        "shareLikelihood": 0,
        "purchaseIntent": 0,
        "trustLevel": 90
      },
      "primaryEmotion": "focus",
      "emotionalValence": "neutral",
      "wouldShare": false,
      "wouldSubscribe": false,
      "wouldPurchase": false,
      "attentionMoments": [
        { "timestamp": "00:05", "type": "hook", "intensity": 8 }
      ],
      "emotionalJourney": [
        { "timestamp": "00:10", "emotion": "anxiety", "intensity": 6 }
      ],
      "keyInsights": ["Lighting improved attention", "Noise reduced memory encoding"],
      "recommendations": ["Reduce noise", "Increase natural light"]
    }
    // ...repeat for students 2-10
  ],
  "aggregates": [
    {
      "category": "age",
      "segment": "gen-z",
      "segmentLabel": "Gen Z (18-24)",
      "sampleSize": 10,
      "averages": {
        "engagement": 78.2,
        "attention": 80.1,
        "emotionalIntensity": 65.4,
        "memoryEncoding": 70.2,
        "shareLikelihood": 0,
        "purchaseIntent": 0
      },
      "counts": {
        "wouldShare": 0,
        "wouldSubscribe": 0,
        "wouldPurchase": 0
      },
      "dominantEmotion": "focus",
      "keyInsights": ["Lighting is the strongest positive factor", "Noise is the strongest negative factor"]
    }
  ],
  "api": {
    "version": "1.0.0",
    "documentation": "/docs/developer/results-api",
    "schema": "/api/developer/schema"
  }
}
```

---

## Scenario 2: Content Impact Analysis (Video)

**Prompt:**
> Analyze the impact of a YouTube video on 10 different brain personas. Include engagement, attention, and emotional metrics for each persona.

**Workflow Nodes:**
- 10 persona nodes (Gen Z, Millennial, Boomer, etc.)
- 1 content node (YouTube video)

**Expected Output:**
```json
{
  "success": true,
  "execution": {
    "executionId": "def456",
    "workflowName": "Content Impact Analysis",
    "status": "completed",
    "content": {
      "url": "https://youtube.com/watch?v=xyz",
      "title": "Viral Video",
      "platform": "youtube"
    },
    "overallScore": 90.1,
    "viralPotential": "high",
    "nodeStats": {
      "total": 10,
      "completed": 10,
      "failed": 0
    },
    "aggregatedMetrics": {
      "avgEngagement": 88.5,
      "avgAttention": 91.2,
      "avgEmotionalIntensity": 75.3,
      "shareRate": 80,
      "purchaseRate": 10,
      "topEmotion": "joy"
    },
    "executionTimeMs": 1500,
    "creditsUsed": 10,
    "timestamps": {
      "started": "2026-01-11T11:00:00Z",
      "completed": "2026-01-11T11:00:02Z"
    }
  },
  "nodes": [
    {
      "nodeId": "persona-1",
      "nodeType": "persona",
      "nodeLabel": "Gen Z Urban",
      "demographicId": "gen-z-urban",
      "demographicTraits": ["early adopter", "high social"],
      "personaCategory": "demographic",
      "scores": {
        "engagement": 95,
        "attention": 98,
        "emotionalIntensity": 80,
        "memoryEncoding": 90,
        "shareLikelihood": 95,
        "purchaseIntent": 20,
        "trustLevel": 85
      },
      "primaryEmotion": "joy",
      "emotionalValence": "positive",
      "wouldShare": true,
      "wouldSubscribe": true,
      "wouldPurchase": false,
      "attentionMoments": [
        { "timestamp": "00:03", "type": "hook", "intensity": 9 }
      ],
      "emotionalJourney": [
        { "timestamp": "00:15", "emotion": "surprise", "intensity": 8 }
      ],
      "keyInsights": ["Strong hook for Gen Z", "High share motivation"],
      "recommendations": ["Add more interactive elements"]
    }
    // ...repeat for personas 2-10
  ],
  "aggregates": [
    {
      "category": "demographic",
      "segment": "gen-z-urban",
      "segmentLabel": "Gen Z Urban",
      "sampleSize": 1,
      "averages": {
        "engagement": 95,
        "attention": 98,
        "emotionalIntensity": 80,
        "memoryEncoding": 90,
        "shareLikelihood": 95,
        "purchaseIntent": 20
      },
      "counts": {
        "wouldShare": 1,
        "wouldSubscribe": 1,
        "wouldPurchase": 0
      },
      "dominantEmotion": "joy",
      "keyInsights": ["Gen Z is most likely to share"]
    }
  ],
  "api": {
    "version": "1.0.0",
    "documentation": "/docs/developer/results-api",
    "schema": "/api/developer/schema"
  }
}
```

---

## Scenario 3: Patient vs. Control Group (Clinical)

**Prompt:**
> Compare a patient’s brain scan to healthy controls. Highlight deviations and clinical implications.

**Workflow Nodes:**
- 1 patient node
- 2 reference nodes (healthy controls)
- 5 region nodes

**Expected Output:**
```json
{
  "success": true,
  "execution": {
    "executionId": "ghi789",
    "workflowName": "Patient vs Control Comparison",
    "status": "completed",
    "content": {
      "url": "",
      "title": "Patient MRI",
      "platform": "clinical"
    },
    "overallScore": 70.2,
    "viralPotential": "low",
    "nodeStats": {
      "total": 8,
      "completed": 8,
      "failed": 0
    },
    "aggregatedMetrics": {
      "avgEngagement": 65.1,
      "avgAttention": 68.2,
      "avgEmotionalIntensity": 55.3,
      "shareRate": 0,
      "purchaseRate": 0,
      "topEmotion": "concern"
    },
    "executionTimeMs": 1800,
    "creditsUsed": 8,
    "timestamps": {
      "started": "2026-01-11T12:00:00Z",
      "completed": "2026-01-11T12:00:02Z"
    }
  },
  "nodes": [
    {
      "nodeId": "patient-1",
      "nodeType": "patient",
      "nodeLabel": "Patient",
      "demographicId": "adult",
      "demographicTraits": ["moderate stress"],
      "personaCategory": "clinical",
      "scores": {
        "engagement": 60,
        "attention": 65,
        "emotionalIntensity": 55,
        "memoryEncoding": 50,
        "shareLikelihood": 0,
        "purchaseIntent": 0,
        "trustLevel": 80
      },
      "primaryEmotion": "concern",
      "emotionalValence": "negative",
      "wouldShare": false,
      "wouldSubscribe": false,
      "wouldPurchase": false,
      "attentionMoments": [
        { "timestamp": "00:20", "type": "drop", "intensity": 5 }
      ],
      "emotionalJourney": [
        { "timestamp": "00:30", "emotion": "worry", "intensity": 7 }
      ],
      "keyInsights": ["Deviation in left hippocampus"],
      "recommendations": ["Schedule follow-up scan"]
    }
    // ...reference/control nodes
  ],
  "aggregates": [
    {
      "category": "clinical",
      "segment": "adult",
      "segmentLabel": "Adult Patient",
      "sampleSize": 1,
      "averages": {
        "engagement": 60,
        "attention": 65,
        "emotionalIntensity": 55,
        "memoryEncoding": 50,
        "shareLikelihood": 0,
        "purchaseIntent": 0
      },
      "counts": {
        "wouldShare": 0,
        "wouldSubscribe": 0,
        "wouldPurchase": 0
      },
      "dominantEmotion": "concern",
      "keyInsights": ["Patient shows moderate deviation from controls"]
    }
  ],
  "api": {
    "version": "1.0.0",
    "documentation": "/docs/developer/results-api",
    "schema": "/api/developer/schema"
  }
}
```

---

## More Scenarios
- Mix of stress levels, test types, age groups, and environmental factors
- Content analysis for TikTok, Instagram, etc.
- Group-level aggregates and per-node breakdowns
- Custom dashboard configuration examples

---

**Use these scenarios for model training, prompt engineering, and developer reference.**
