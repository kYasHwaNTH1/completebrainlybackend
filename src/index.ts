import express from 'express';
import mongoose from'mongoose';
import { userRouter } from './userRouter';
import dotenv from 'dotenv';
dotenv.config();



const app =express()
const PORT = process.env.PORT || 4000


app.use(express.json())
app.use("/api/v1/users", userRouter);


async function main() {
     
    app.listen(PORT,()=>{
        console.log(`server running on port ${PORT}`)
    })


}

main()