import { GoogleGenAI, Type } from '@google/genai';
import { Listing, Profile } from './db.js';

// Setup Google Gen AI with user-agent for telemetry
const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not defined. AI Scoring will use local fallback.');
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

/**
 * Perform manual compatibility calculation as fallback
 */
export function calculateFallbackScore(listing: Listing, profile: Profile): { score: number; explanation: string } {
  let budgetScore = 0;
  let locationScore = 0;
  let dateScore = 0;
  let typeScore = 0;

  // 1. Budget Match (40%)
  if (listing.rent >= profile.budgetMin && listing.rent <= profile.budgetMax) {
    budgetScore = 40;
  } else if (listing.rent < profile.budgetMin) {
    // Under budget is fine but check margin
    const diff = profile.budgetMin - listing.rent;
    if (diff < 200) budgetScore = 35;
    else budgetScore = 25;
  } else {
    // Over budget is penalized proportionally
    const overRent = listing.rent - profile.budgetMax;
    const penaltyRatio = Math.min(overRent / profile.budgetMax, 1);
    budgetScore = Math.max(0, Math.round(40 * (1 - penaltyRatio)));
  }

  // 2. Location Match (30%)
  const listLoc = listing.location.toLowerCase();
  const prefLoc = profile.preferredLocation.toLowerCase();
  if (listLoc.includes(prefLoc) || prefLoc.includes(listLoc)) {
    locationScore = 30;
  } else {
    // Partial word matching
    const prefWords = prefLoc.split(/[\s,]+/);
    const matches = prefWords.filter(word => word.length > 2 && listLoc.includes(word));
    if (matches.length > 0) {
      locationScore = 20;
    } else {
      locationScore = 10; // general match
    }
  }

  // 3. Move-in Date Match (15%)
  try {
    const listDate = new Date(listing.availableDate).getTime();
    const prefDate = new Date(profile.moveInDate).getTime();
    const diffDays = Math.abs(listDate - prefDate) / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) {
      dateScore = 15;
    } else if (diffDays <= 30) {
      dateScore = 10;
    } else if (diffDays <= 60) {
      dateScore = 5;
    } else {
      dateScore = 2;
    }
  } catch {
    dateScore = 5;
  }

  // 4. Room Type Preference Match (15%)
  if (profile.roomTypePreference === 'Any' || profile.roomTypePreference === listing.roomType) {
    typeScore = 15;
  } else {
    typeScore = 5;
  }

  const finalScore = budgetScore + locationScore + dateScore + typeScore;

  // Dynamic explanation generation
  let explanation = '';
  if (finalScore >= 80) {
    explanation = `Excellent match! Budget is within range (₹${listing.rent}/mo vs budget up to ₹${profile.budgetMax}/mo) and location matches '${profile.preferredLocation}'. Availability dates are highly compatible.`;
  } else if (finalScore >= 60) {
    explanation = `Good compatibility. There is some minor variance in budget or preferred room type (${listing.roomType} listed vs ${profile.roomTypePreference} preferred), but location is a solid match.`;
  } else {
    explanation = `Moderate match. The rent is ₹${listing.rent}/mo, which might be outside or at the absolute limit of your preferred ₹${profile.budgetMin}-₹${profile.budgetMax}/mo range, or the location details have partial compatibility.`;
  }

  return {
    score: finalScore,
    explanation,
  };
}

/**
 * Computes AI compatibility score using Gemini or fallback
 */
export async function computeAICompatibility(listing: Listing, profile: Profile): Promise<{ score: number; explanation: string }> {
  const ai = getAiClient();
  if (!ai) {
    console.log('Skipping Gemini call due to missing API Key. Running fallback calculation.');
    return calculateFallbackScore(listing, profile);
  }

  const prompt = `
Given this room listing:
${JSON.stringify({
  title: listing.title,
  description: listing.description,
  location: listing.location,
  rent: listing.rent,
  availableDate: listing.availableDate,
  roomType: listing.roomType,
  furnishingStatus: listing.furnishingStatus,
  roomsCount: listing.roomsCount,
  amenities: listing.amenities,
}, null, 2)}

and this tenant profile:
${JSON.stringify({
  preferredLocation: profile.preferredLocation,
  budgetMin: profile.budgetMin,
  budgetMax: profile.budgetMax,
  moveInDate: profile.moveInDate,
  roomTypePreference: profile.roomTypePreference,
  bio: profile.bio,
}, null, 2)}

Compute a compatibility score from 0-100.
Evaluate:
1. Location Match (How close is the listing to tenant's preferred location?)
2. Budget Match (Does the rent fit the tenant's budget range?)
3. Move-in Date Compatibility (Is the listing available near tenant's move-in date?)
4. Room Type (Is it Single, Shared, Studio, Entire Flat, matching preference?)
5. Lifestyle Fit (Based on the description and bio, is there compatibility?)

Return your evaluation. You must respond strictly in JSON with the following structure:
{
  "score": number,
  "explanation": string
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: {
              type: Type.INTEGER,
              description: 'Overall compatibility score between 0 and 100',
            },
            explanation: {
              type: Type.STRING,
              description: 'A friendly explanation explaining the positive matches and potential trade-offs',
            },
          },
          required: ['score', 'explanation'],
        },
      },
    });

    const textResult = response.text?.trim() || '';
    if (!textResult) {
      throw new Error('Gemini returned empty text response');
    }

    const data = JSON.parse(textResult);
    if (typeof data.score === 'number' && typeof data.explanation === 'string') {
      return {
        score: Math.min(100, Math.max(0, data.score)),
        explanation: data.explanation,
      };
    }
    throw new Error('Invalid structure in Gemini JSON output');
  } catch (error) {
    console.error('Gemini API Error, falling back to manual scoring:', error);
    return calculateFallbackScore(listing, profile);
  }
}
