
import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { Annotation, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { TavilySearch } from "@langchain/tavily";
dotenv.config();

const app = express();
const port = 5001;

app.use(express.json());
//exporting GOOGLE_API_KEY--------------------------->>>
const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

//tavily integration -------->>>>>>>>>>>

const tool = new TavilySearch({
  maxResults: 5,
  topic: "general",

});
//making Array of tools ------>>>
const tools = [tool]
const toolNode = new ToolNode(tools)

// LLM with longChain -------------------------------->>>
//Now using Groq api ----------->
const llm =new ChatGroq({
  model: "openai/gpt-oss-120b",
  temperature:0.7,
  maxTokens:1000,
  maxRetries:2 
}).bindTools(tools) //ab tool use kr payega 



//LangGrap ----------------->>>>>
//State making (ab kaam ni karegi because i have to make conditional edge)
// const state = Annotation.Root({
//   prompt:Annotation,
//   aiMsg:Annotation
// })



//Graph making 
//function making callLLM
const callLLM = async (state) => {
  const response = await llm.invoke([
    {
      role: "system",
      content:
        "You are an assistant named JARVIS. If you don't know the answer, call a relevant tool."
    },
    ...state.messages //TOOls se process karna hai ya llm se
  ]);

  return { messages: [response] };
};
//should continue function
const shouldContinue = (state) => {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage.tool_calls?.length > 0) {
    return "tools";
  }

  return "__end__";
};

//node making------->>>>>>>
const graph = new StateGraph(MessagesAnnotation)//State can be done here for conditional edge (Prebuilt state)
.addNode("agent",callLLM)
.addNode("tools",toolNode) // Tools ke liye tool node bana rahe hai 
.addEdge("__start__","agent")
.addEdge("tools","agent")
.addConditionalEdges("agent", shouldContinue)//calling 
.compile()



//--------------------------->>>>>
app.post("/ai", async (req, res) => {
  const { input } = req.body;

  const  response =await graph.invoke({messages:[
    {
      role:"user",
      content:input  //messgaes array ke andar chala jayega 
    }
  ]})
  console.log(response)
  

  return res.status(200).json({ "ai" : response.messages[response.messages.length-1].content});
  //debugging -->observe the output → identify the uncertain part → inspect runtime data → narrow down the cause.
//   console.dir(response.messages, { depth: null });

// const lastMessage = response.messages[response.messages.length - 1];

// return res.status(200).json({
//   ai: lastMessage.content,
//   lastMessageType: lastMessage.constructor.name,
//   toolCalls: lastMessage.tool_calls
// });
});
//ye sab krke pata chala token 200 tha usko 1000 kiya



//Get enpoint ----------------->>>
app.get("/", (req, res) => {
  return res.json({
    message: "Hello from level 4",
  });
});

app.listen(port, () => {
  console.log("Server Started");
});
