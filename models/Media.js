import mongoose from "mongoose";

const mediaSchema = new mongoose.Schema(
  {
    surl: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    fileType: {
      type: String,
      required: true,
      lowercase: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
    },

    thumbnail: {
      type: String,
      default: null,
    },

    size: {
      type: Number,
      required: true,
      min: 0,
    },
    publicId: {
      type: String, 
    },
    duration: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

const Media = mongoose.models.Media || mongoose.model("Media", mediaSchema);

export default Media;