import OpenAI from "openai";
import { execSync } from "node:child_process";
import { z } from "zod";

const client = new OpenAI({
  apiKey: "AIzaSyBazNCTEL2Jc4aiVtTRGKtGduR2SWFIMxg",
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
});

// tools
function executeCommand(cmd = "") {
  const result = execSync(cmd);
  return result.toString();
}

const functionMapping = {
  executeCommand,
};

const SYSTEM_PROMPT = `You are an expert AI assistant that controls the user's machine.
Analyze the user's query and decide commands.
Always respond in structured format.

Available Tools:
- executeCommand(command:string)
`;

const outputSchema = z.object({
  type: z.enum(["tool_call", "text"]),
  finalOutput: z.boolean(),
  text_content: z.string().optional().nullable(),
  tool_call: z
    .object({
      tool_name: z.string(),
      params: z.array(z.string()),
    })
    .optional()
    .nullable(),
});

// ✅ FIX: messages defined properly
const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];

export async function run(query = "") {
  messages.push({ role: "user", content: query });

  while (true) {
    const result = await client.chat.completions.create({
      model: "gemini-3-flash-preview",
      messages: messages,
    });

    // ✅ FIX: correct parsing
const raw = result.choices[0].message.content;
console.log("RAW:", raw);

// ✅ remove ```json ... ```
const cleaned = raw
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

let parsed_output;
try {
  parsed_output = JSON.parse(cleaned);
} catch (e) {
  console.log("❌ Invalid JSON from model");
  break;
}

    if (!parsed_output) {
      console.log("❌ No parsed output");
      break;
    }

    let cmd = null;

// handle multiple possible formats
if (parsed_output?.tool_call) {
  cmd = parsed_output.tool_call.params?.[0];
} else if (parsed_output?.actions) {
  const action = parsed_output.actions[0];

  if (action?.parameters?.command) {
    cmd = action.parameters.command;
  } else if (action?.command && action?.action === "executeCommand") {
    cmd = action.command;
  } else if (action?.command && !action?.action) {
    cmd = action.command;
  }
} else if (Array.isArray(parsed_output)) {
  const action = parsed_output[0];
  cmd = action?.parameters?.command;
}

// 🚀 EXECUTE IF FOUND
if (cmd) {
  console.log("Executing:", cmd);

  const output = executeCommand(cmd);

  console.log("Output:", output);

  messages.push({
    role: "assistant",
    content: JSON.stringify({
      command: cmd,
      output,
    }),
  });

} else {
  console.log("❌ No command found");
  break;
}

    console.log(
      "Agent Says:",
      JSON.stringify(parsed_output, null, 2)
    );
    break;
  }
  
}

// run
// run("Make a new folder name as hello");