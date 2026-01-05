import neynar from "@/common/data/api/neynar";
import { NextResponse } from "next/server";

import {
  MAX_TRENDING_CASTS,
  MODEL_TEMPERATURE_CREATIVE,
  TODAY_TIME_DATE,
  USERS_CASTS_CHRONOLOGICALLY,
  USE_USER_PAST_CASTS,
  VENICE_API_KEY,
  VENICE_MODEL,
} from "./config";
import { CREATE_PROMPT, ENHANCE_PROMPT, SYSTEM_PROMPT } from "./prompts";
import {
  applyBotIdHeaders,
  enforceBotIdProtection,
} from "@/common/utils/botIdProtection";
// TrendingTimeWindow type is no longer exported, using string literal type
type TrendingTimeWindow = "1h" | "6h" | "24h" | "7d";

//
// Process Trending Casts array and return a string with the top MAX_TRENDING_CASTS casts
//
function processTrendingCasts(casts: any) {
  let trendingCasts = casts.casts.map((cast) => {
    const username = cast.author.username;
    const text = cast.text;
    return `<trending_tweet>\n@${username}: ${text}\n</trending_tweet>\n\n`;
  });

  trendingCasts = trendingCasts.slice(0, MAX_TRENDING_CASTS);
  return trendingCasts.join("");
}

export async function POST(request: Request) {
  const botCheck = await enforceBotIdProtection(request);
  if (botCheck instanceof NextResponse) {
    return botCheck;
  }

  const verification = botCheck;
  const respond = (body: unknown, init?: Parameters<typeof NextResponse.json>[1]) => {
    const response = NextResponse.json(body, init);
    applyBotIdHeaders(response, verification);
    return response;
  };

  const res = await request.json();
  const userFid = res.fid;

  if (!VENICE_API_KEY) {
    return respond({ error: "API key is missing" }, { status: 400 });
  }

  if (!userFid) {
    return respond({ error: "User fid is missing" }, { status: 400 });
  }

  // get values
  // if USE_USER_PAST_CASTS
  // get user past casts as examples
  let user_past_casts;
  let userCasts: any;
  if (USE_USER_PAST_CASTS) {
    if (USERS_CASTS_CHRONOLOGICALLY) {
      userCasts = await neynar.fetchCastsForUser({
        fid: userFid,
        viewerFid: userFid,
        limit: MAX_TRENDING_CASTS,
      });
    } else {
      userCasts = await neynar.fetchPopularCastsByUser({ fid: userFid });
    }

    const exampleCastsText = userCasts.casts?.length
      ? userCasts.casts
        .map((cast) => `<tweet>${cast.text}</tweet>\n`)
        .join("\n")
      : "";

    user_past_casts = `
# Users past tweets:
<USER_PAST_TWEETS>
${exampleCastsText}
</USER_PAST_TWEETS>
`;
  }

  const fids = [userFid];
  const currentUser = await neynar.fetchBulkUsers({ fids });
  const userName = currentUser.users[0].username || "";
  const userBio = currentUser.users[0].profile.bio.text || "";

  // Fill in the appropriate values
  const viewerFid = userFid;
  const timeWindow: TrendingTimeWindow = "24h";
  const limit = MAX_TRENDING_CASTS;
  //const channelId =
  //const parentUrl =
  //const provider =
  //const providerMetadata =
  const trendingCasts = processTrendingCasts(await neynar.fetchTrendingFeed({
    viewerFid,
    timeWindow,
    limit,
  }));
  const userCast = res.text || "";

  // generate or enahance casts
  try {
    // select prompt for enhance or create cast
    const PROMPT =
      userCast.trim().length === 0 ? CREATE_PROMPT : ENHANCE_PROMPT;

    // setup the system prompt with variables
    const system_prompt = SYSTEM_PROMPT.replace("{USER_NAME}", userName)
      .replace("{TODAY_TIME_DATE}", TODAY_TIME_DATE)
      .replace("{USER_BIO}", userBio);
    // .replace("{USER_TWEETS}", exampleCastsText);

    // setup the user prompt with variables
    const user_prompt =
      PROMPT.replace("{TRENDING_FEED}", trendingCasts).replace(
        "{USER_TWEETS}",
        user_past_casts || "",
      ) + userCast;

    // use for debug
    // if (DEBUG_PROMPTS) console.log(`\n\n---------SYSTEM-----------`);
    // console.log(system_prompt);
    // console.log(`\n\n---------USER-----------`);
    // console.log(user_prompt);
    // console.log(`--------------------`);

    // build the venice model options
    const getOptions = (messages: any) => ({
      method: "POST",
      headers: {
        Authorization: "Bearer " + VENICE_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: VENICE_MODEL,
        temperature: MODEL_TEMPERATURE_CREATIVE,
        messages,
        venice_parameters: {
          include_venice_system_prompt: false,
        },
      }),
    });

    // build model system and user prompts
    const messages = [
      { role: "system", content: system_prompt },
      { role: "user", content: user_prompt },
    ];

    const fetchResponse = await fetch(
      "https://api.venice.ai/api/v1/chat/completions",
      getOptions(messages),
    );
    const response = await fetchResponse.json();

    // process model response
    let result = response.choices[0].message.content;
    result = result
      .replace(/<\/think>.*?<\/think>/gs, "") // remove <think> tags
      .replace(/^['"]|['"]$/g, ""); // remove quotes marks

    return respond({ response: result });
  } catch (error) {
    console.error("Venice API error:", error);
    return respond(
      {
        error: "Failed to fetch data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
