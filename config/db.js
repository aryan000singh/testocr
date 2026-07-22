import mongoose from "mongoose";
import dns from "dns";

//
dns.setServers(["8.8.8.8", "1.1.1.1"])
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
 
  await mongoose.connect(process.env.MONGO_URI);
  isConnected = true;
  console.log("MongoDB Connected");
};

export default connectDB;