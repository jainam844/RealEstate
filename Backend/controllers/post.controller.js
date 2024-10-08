import prisma from "../lib/prisma.js";
import jwt from "jsonwebtoken";

export const getPosts = async (req, res) => {
    const query = req.query;

    try {
        // Convert query parameters to the correct types
        const minPrice = parseInt(query.minPrice) || 0;
        const maxPrice = parseInt(query.maxPrice) || Number.MAX_SAFE_INTEGER;
        const bedroom = parseInt(query.bedroom) || undefined;

        // Fetch posts based on query parameters
        const posts = await prisma.post.findMany({
            where: {
                city: query.city || undefined,
                type: query.type || undefined,
                property: query.property || undefined,
                bedroom: bedroom,
                price: {
                    gte: minPrice,
                },
            },
        });
        res.status(200).json(posts);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Failed to get posts" });
    }
};

export const getPost = async (req, res) => {
    try {
        const id = req.params.id;
        const post = await prisma.post.findUnique({
            where: { id },
            include: {
                postDetail: true,
                user: {
                    select: {
                        username: true,
                        avatar: true,
                    },
                },
            },
        });

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const token = req.cookies?.token;
        if (token) {
            jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
                if (!err) {
                    const saved = await prisma.savedPost.findUnique({
                        where: {
                            userId_postId: {
                                postId: id,
                                userId: payload.id,
                            },
                        },
                    });
                    return res.status(200).json({ ...post, isSaved: saved ? true : false }); // Exit after sending the response
                } else {
                    // Handle JWT verification error if necessary
                }
            });
        } else {
            return res.status(200).json({ ...post, isSaved: false }); // Return after sending response
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Failed to get post" });
    }
};

export const addPost = async (req, res) => {
    const { postData, postDetail } = req.body;  // Destructure to get postData and postDetail
    const tokenUserId = req.userId;

    try {
        // Ensure postData and postDetail are correctly structured
        if (!postData || !postDetail) {
            return res.status(400).json({ message: "Missing required data" });
        }

        const newPost = await prisma.post.create({
            data: {
                ...postData,
                userId: tokenUserId,
                postDetail: {
                    create: postDetail,
                },
            },
        });

        res.status(201).json(newPost);
    } catch (err) {
        console.error("Error creating post:", err);
        res.status(500).json({ message: "Failed to add post" });
    }
};

export const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const tokenUserId = req.userId
        const updatedPost = await prisma.post.update({
            where: { id: Number(id) },
            data: { title, content },
        });
        res.status(200).json(updatedPost);
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Failed to update post" });
    }
};

export const deletePost = async (req, res) => {
    const id = req.params.id;
    const tokenUserId = req.userId;

    try {
        const post = await prisma.post.findUnique({
            where: { id },
        });

        if (post.userId !== tokenUserId) {
            return res.status(403).json({ message: "Not Authorized!" });
        }

        await prisma.post.delete({
            where: { id },
        });

        res.status(200).json({ message: "Post deleted" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Failed to delete post" });
    }
};