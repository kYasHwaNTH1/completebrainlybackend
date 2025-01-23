import axios from "axios"
import * as Cheerio from "cheerio";
import {YoutubeTranscript} from 'youtube-transcript'
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from "openai";

export async function gettweet(tweeturl:string): Promise<any> {
     const tweetId = tweeturl.split('/status/')[1]
     console.log("from getweet function all good")
     const response = await axios.get(`https://api.twitter.com/2/tweets/${tweetId}`, {
        headers: {
          Authorization: `Bearer ${process.env.TWITTER_API_KEY}`,
        },
      });

      return response.data
}


export async function getWebsite(url: string): Promise<string> {
    try {
      // Fetch the HTML content of the website
      const { data } = await axios.get<string>(url); // Ensure the response is a string
  
      // Load the HTML into Cheerio
      const $ = Cheerio.load(data);
  
      // Extract all text from the website
      const allText = $("body").text(); // Extract all text from the <body> tag
  
      // Clean up extra whitespace and return
      return allText.replace(/\s+/g, " ").trim();
    } catch (error) {
      console.error("Error fetching website data:", error);
      throw new Error("Failed to fetch and extract text from the website");
    }
  }






function extractYouTubeVideoId(url: string): string | null {
    const match = url.match(/(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/shorts\/)([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }

  async function getTranscript(videoId:string) {
    try {
      const transcript = await YoutubeTranscript.fetchTranscript(videoId);
  
      // Combine transcript into one string
      const transcriptText = transcript.map((item) => item.text).join(" ");
      console.log("Transcript:", transcriptText);
  
      return transcriptText;
    } catch (error) {
      console.error("Error fetching transcript:", error);
    }
  }

 export async function extractYouTubeContent(youtubeUrl: string): Promise<string> {
    const videoId = extractYouTubeVideoId(youtubeUrl);
    if (!videoId) throw new Error("Invalid YouTube URL");
  
    // Fetch video metadata
    const metadataResponse = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${process.env.YOUTUBE_API_KEY}`
    );

    //@ts-ignore
    const title = metadataResponse.data.items[0]?.snippet?.title || "";
     //@ts-ignore
    const description = metadataResponse.data.items[0]?.snippet?.description || "";
  
    const transcript = getTranscript(videoId);

    console.log("Transcription  "+ transcript)
  //@ts-ignore
    return transcript;
  }



  // first make these api in env to make it into github
  // divide the content in generateembed function into chunks
  // that's it complete backend is generated
  // make frontend slowly don't rush as you need to learn some devops.
  // choose one open source project learn about the files they have in their repository using chatgpt and explore to understand the codebase.