import { z } from "zod";

const VENICE_API_KEY = process.env.VENICE_API_KEY;
const MAX_INPUT_CHARS = 2000;
const requestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "User input is missing")
    .max(MAX_INPUT_CHARS, `User input exceeds ${MAX_INPUT_CHARS} characters`),
});
class BadRequestError extends Error {
  status = 400;
  constructor(message: string) {
    super(message);
  }
}

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!VENICE_API_KEY) {
    return new Response("API key is missing", { status: 400 });
  }

  let userInput: string;
  try {
    userInput = await parseUserInput(request);
  } catch (error) {
    if (error instanceof BadRequestError) {
      return new Response(error.message, { status: error.status });
    }
    console.error("Unexpected error parsing request body:", error);
    return new Response("Invalid request body", { status: 400 });
  }
  const truncatedInput = userInput.slice(0, MAX_INPUT_CHARS); // never log or send more than the limit

  // Models in the order requested by the user
  const models = [
    "mistral-31-24b",
    "qwen3-coder-480b-a35b-instruct",
    "llama-3.3-70b"
  ];
  let lastError;
  for (const model of models) {
    try {
      const options = {
        method: "POST",
        headers: {
          Authorization: "Bearer " + VENICE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: PROMPT.replace("{{user context}}", truncatedInput),
            },
          ],
          venice_parameters: {
            include_venice_system_prompt: false,
          },
        }),
      };
      const fetchResponse = await fetch(
        "https://api.venice.ai/api/v1/chat/completions",
        options,
      );
      if (!fetchResponse.ok) {
        lastError = await fetchResponse.text();
        continue;
      }
      const result = await fetchResponse.json();
      const choice = result.choices?.[0]?.message?.content;
      if (!choice) {
        lastError = result;
        continue;
      }
      const htmlMatch = choice.match(/(<html[\s\S]*<\/html>)/i);
      return Response.json({ response: htmlMatch ? htmlMatch[1] : choice, model });
    } catch (error) {
      console.error(`Error fetching data for model ${model}:`, error);
      lastError = error;
      continue;
    }
  }
  console.error("All models failed:", lastError);
  return new Response("All models failed", { status: 500 });
}

async function parseUserInput(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    throw new BadRequestError("Invalid JSON payload");
  }
  const result = requestSchema.safeParse(payload);
  if (!result.success) {
    const issue = result.error.issues.at(0);
    throw new BadRequestError(issue?.message ?? "Invalid request body");
  }
  return result.data.text;
}

const PROMPT = `\
You are a creative and skilled webpage background designer. Your goal is to produce **only valid HTML and CSS** (no JavaScript) that creates a visually appealing, responsive background for a webpage. 

Please adhere to the following requirements and guidelines:

1. **HTML-Only Output**:
  - Output must be a minimal, valid HTML structure (e.g., <html>, <head>, <body>) with inline or <style> block CSS. 
  - No JavaScript, external libraries, or external CSS files are permitted.
  - No additional text or explanations—only code.

2. **Responsiveness and Compatibility**:
  - The background should automatically scale to fill the entire browser window on various screen sizes and devices.
  - Ensure compatibility across modern browsers.

3. **Visual Quality and Creativity**:
  - The design should be **visually appealing and modern**. 
  - Consider using **gradients**, **patterns**, **subtle animations** (CSS-based only), or **layered effects** to enhance the background. 
  - You can embed publicly hosted images, but do not embed images that are Base64 encoded.
  - Keep the background from overshadowing typical webpage content (e.g., maintain good contrast for text readability).

4. **Maintainability**:
  - The code does not need to be maintained, so don't worry about conciseness or organization. Just make sure the code works, matches the provided context, and is visually appealing.

5. **Security and Performance**:
  - Do not include any scripts or dynamic code.
  - Avoid large file sizes where possible (e.g., if embedding images, aim for lightweight data URLs).

6. **Incorporate User Context**:
  - The user's instructions (appended at runtime) will provide specific design preferences, themes, or elements they want to include.
  - Integrate the user’s context into the final design while following the guidelines above.
  - Do not include text in the background unless the user explicitly requests it

Important: Do not output anything except for the final HTML and CSS code necessary to render the background. 

User context: "{{user context}}"
`;
