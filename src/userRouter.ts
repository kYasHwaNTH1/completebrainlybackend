import express,{ Router } from "express";
import { PrismaClient } from "@prisma/client";
import jwt from 'jsonwebtoken'
import { Pinecone } from '@pinecone-database/pinecone';
import  { GoogleGenerativeAI } from "@google/generative-ai"
import axios from "axios";
import { gettweet, getWebsite,extractYouTubeContent } from "./extrafunction";

const pc = new Pinecone({
  apiKey: 'pcsk_3sLsng_94QHT5noYv27oeTeNgYHwbPCmhBCpK2Gt2irZUKSMyNQgccxQKCfeFVKs5Mk8Yb'
});
const index = pc.index('newindex');


const client = new PrismaClient();
const SECRET = "FUnckingscret";
const genAI = new GoogleGenerativeAI('AIzaSyC7BrqI1J228tlVuH4sfG5du5pZ7IebxF0');
const model = genAI.getGenerativeModel({ model: "text-embedding-004"});

export const userRouter = express.Router();


async function generateAndStoreEmbedding(userId: string, link: string, content: string): Promise<void>{
      try {

//let stupd = "A day on Venus is longer than a year on Venus. There are more stars in the universe than grains of sand on all Earth's beaches. The Sun accounts for 99.86% of the mass in the Solar System. Neutron stars are so dense that a sugar-cube-sized amount of their material would weigh a billion tons. Light takes 8 minutes and 20 seconds to travel from the Sun to Earth. Saturn's moon Titan has rivers, lakes, and seas made of liquid methane and ethane. Jupiter's Great Red Spot is a storm that has been raging for over 300 years. One million Earths could fit inside the Sun. Space is completely silent because there is no medium for sound to travel. A teaspoon of water contains about 8.3 x 10^24 molecules."
        const result = await model.embedContent(content);
        const embedding = result.embedding.values

        console.log(embedding)
      
          // Store embedding in Pinecone
          await index.namespace('firstnamespace').upsert(
               [
                {
                  id: userId.toString(), // Unique ID for the vector
                  values: embedding,
                  metadata: {
                    user_id: userId,
                    text:content,
                    link
                  },
                },
              ],
          );
        
      } catch (error) {
          console.error(error)
      }
}

userRouter.post('/signup',async(req:any,res:any)=>{
  
   const {username,password,email} = req.body;

   try {
    
    const existing = await client.user.findFirst({where :{email} })

    if(existing){
        return res.status(400).json({msg:"User already exists"})
    }
     
     await client.user.create({
        data:{
            username,
            password,
            email
        }
     })

   } catch (error) {
     console.error(error)
     return res.status(500).json({msg:error})
   } 

   res.json({success:true})
})

userRouter.post('/signin',async(req:any,res:any)=>{

    const {email,password} = req.body;

    try{
         const user = await client.user.findFirst({where: {email,password} })

         if(!user){
            return res.status(400).json({msg:"User not found"})
         }
 
         const token = jwt.sign({id:user.id},"FUnckingscret")

         res.json({success:true, token:token})
    }
    catch(error){
        console.error(error)
        return res.status(500).json({msg:error})
    }
})

function Middleware(req:any,res:any,next:any){
    const token = req.header("Authorization")
    console.log(token)
    if(!token){
        return res.status(401).json({msg:"No token, authorization denied"})
    }

    try{
        const decoded = jwt.verify(token as string, SECRET) 
        req.id = decoded;
        next()
    }
    catch(error){
        return res.status(401).json({msg:"Token is not valid", error:error})
    }
}

userRouter.post('/putcontent',Middleware,async(req:any,res:any)=>{
    const {title,link,type} = req.body;
    const userId = req.id.id

    try{
        await client.content.create({
            data:{
                user_id:userId,
                title,
                link,
                type
            }
        })

let response=""
if(type == 'tweet'){
  response = await gettweet(link)
 
 // console.log(response.data.text)
 //@ts-ignore
  generateAndStoreEmbedding(userId,link,response.data.text)
}
else if(type == 'youtube'){
    response = await extractYouTubeContent(link)
    generateAndStoreEmbedding(userId,link,response)
}
else if(type == 'website'){
    response = await getWebsite(link)
    generateAndStoreEmbedding(userId,link,response)
}
        res.json({success:true, msg:"Content added"})
    }
    catch(err){
        console.error(err)
        return res.status(500).json({msg:err})
    }
   
})


userRouter.get('/getcontent',Middleware,async (req:any,res:any)=>{
       const user_id  = req.id.id;
       try{
          const contents = await client.content.findMany({where:{user_id}});
          if(!contents){
            res.json({msg:"Please Add content here to show the content"})
          }
          res.json({success:true,contents:contents});
       }
       catch(err){
        console.log(err)
        return res.status(500).json({msg:err})
       }
})

userRouter.delete('/deletecontent',Middleware,async (req:any,res:any)=>{
    const content_id = req.body.contentid;
    const user_id = req.id.id;
    try {
         
         await client.content.delete({
           where:{id:content_id, user_id}
         })
         res.json({success:true, msg:"Content deleted"})

    } catch (error) {
        return res.json({msg:error})
    }
})

userRouter.post('/search',Middleware,async(req:any,res:any)=>{
    const search_query = req.body.search_query;
    try{
      const search_embedding = await model.embedContent(search_query);
      const results = await index.namespace('firstnamespace').query({
        vector: search_embedding.embedding.values,
        topK: 10,
        includeMetadata: true,
      })

      const finalanswer = results.matches.map(item => ({
        text: item.metadata?.text,
      }))

    }
    catch(err){
        console.error(err)
        return res.status(500).json({msg:err})
    }
})