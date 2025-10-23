import { Request, Response } from "express";
import { User } from "../../models/user/user";
import crypto from "crypto-js";
import { generateAccessToken } from "../../middlewares/verifyToken";
import { sendError } from "../../utils/helper";

const createUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password, avatar } = req.body;

    const secret_key = process.env.PASS_SEC;

    if (!secret_key) {
      throw new Error("error variable ");
    }

    // Check if user already exists (check both email and username)
    const existingUserByEmail = await User.findByEmail(email);
    const existingUserByUsername = await User.findByUsername(username);

    if (existingUserByEmail || existingUserByUsername) {
      return sendError(res, 400, "Username or Email already exists");
    }

    const hashedPassword = crypto.AES.encrypt(password, secret_key).toString();
    let picked_avatar = avatar || 1;

    // Create new user using Prisma
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      avatar: picked_avatar,
    });

    // Generate JWT token
    const token = generateAccessToken(newUser.id, false);

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: newUser.avatar,
        token,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const loginUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const secret_key = process.env.PASS_SEC;

    if (!secret_key) {
      throw new Error("error variable ");
    }

    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) return sendError(res, 400, "Invalid email or password");

    // Decrypt and compare password
    const decryptedPassword = crypto.AES.decrypt(
      user.password,
      secret_key
    ).toString(crypto.enc.Utf8);

    if (decryptedPassword !== password) {
      return sendError(res, 400, "Invalid email or password");
    }

    // Generate JWT token
    const token = generateAccessToken(user.id, false);

    res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

const getAllUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.findAll();

    res.status(200).json({
      success: true,
      message: "Users retrieved successfully",
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return sendError(res, 500, "Internal server error");
  }
};

export default { createUser, loginUser, getAllUsers };
