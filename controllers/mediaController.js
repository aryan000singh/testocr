import Media from "../models/Media.js";
import cloudinary from "../config/cloudinary.js";

export const saveMedia = async (req, res) => {
  try {
    const {
      surl,
      fileName,
      fileType,
      url,
      thumbnail,
      size,
      duration,
    } = req.body;

    // Validate required fields
    if (!surl || !fileName || !fileType || !url || size === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "surl, fileName, fileType, url and size are required fields",
      });
    }

    // Check if surl already exists
    const existingMedia = await Media.findOne({ surl });

    if (existingMedia) {
      return res.status(409).json({
        success: false,
        message: "Media with this surl already exists",
      });
    }
    const uploadImg = await uploadImage(thumbnail);

    const media = await Media.create({
      surl,
      fileName,
      fileType,
      url,
      publicId: uploadImg?.public_id,
      thumbnail: uploadImg?.url || null,
      size,
      duration: duration || 0,
    });

    return res.status(201).json({
      success: true,
      data: media,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllMedia = async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = 30;

    const skip = (page - 1) * limit;

    const totalItems = await Media.countDocuments();

    const media = await Media.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalItems / limit);

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPages,
      totalItems,
      itemsPerPage: limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      data: media,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteOldMedia = async (req, res) => {
  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30); // change to -30 in production

    const oldMedia = await Media.find({
      createdAt: { $lt: cutoff },
    });

    if (!oldMedia.length) {
      return res.status(200).json({
        success: true,
        message: "No old media to delete",
      });
    }

    await Promise.all(
      oldMedia.map(async (file) => {
        if (file.publicId) {
          try {
            await cloudinary.uploader.destroy(file.publicId);
          } catch (err) {
            console.error(
              `Cloudinary delete failed for ${file.publicId}`,
              err.message
            );
          }
        }
      })
    );

    await Media.deleteMany({
      _id: { $in: oldMedia.map((file) => file._id) },
    });

    return res.status(200).json({
      success: true,
      deletedCount: oldMedia.length,
      message: "Old media deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting old media:", error.message);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const uploadImage = async (imageUrl) => {
  try {
    if (!imageUrl) {
      throw new Error("Image URL is required");
    }

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: "products",
    });

    return {
      success: true,
      public_id: result.public_id,
      url: result.secure_url,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error.message);

    return {
      success: false,
      message: error.message,
    };
  }
};

export const getMediaById = async (req, res) => {
  try {
    const media = await Media.findById(req.params.id);

    if (!media) {
      return res.status(404).json({
        success: false,
        message: "Media not found",
      });
    }

    res.status(200).json({
      success: true,
      data: media,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRandomMedia = async (req, res) => {
  try {
    const media = await Media.aggregate([
      { $sample: { size: 15 } },
      {
        $project: {
          _id: 0,
          createdAt: 0,
          updatedAt: 0,
          __v: 0,
        },
      },
    ]);

    return res.status(200).json({
      success: true,
      count: media.length,
      data: media,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

