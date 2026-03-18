import express from "express";
import {run} from "./agent.js"

const app = express();
const PORT  = process.env.PORT ?? 8000;

app.use(express.json());

app.post("/message",async (req,res)=>{

    const message = req.body.message;
    const history = await run(message);
    return res.json({message:history})
})
app.listen(PORT,()=>{
    console.log(`Server is running on port ${PORT}`);
  
})