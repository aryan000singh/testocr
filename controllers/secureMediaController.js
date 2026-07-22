import Media from "../models/Media.js";
 
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

    const media = await Media.create({
      surl,
      fileName,
      fileType,
      url,
      thumbnail: thumbnail || null,
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

