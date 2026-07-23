import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

export interface JwtPayload {
  userId: string;
  schoolId?: string;
  role: string;
  email?: string;
}

export interface RegistrationJwtPayload {
  email: string;
  purpose: "registration";
}

export const generateAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
};

export const generateRefreshToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "30d" });
};

export const generateRegistrationToken = (email: string): string => {
  return jwt.sign({ email, purpose: "registration" } as RegistrationJwtPayload, JWT_SECRET, { expiresIn: "15m" });
};

export const verifyToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
};

export const verifyRegistrationToken = (token: string): RegistrationJwtPayload => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as RegistrationJwtPayload;
    if (payload.purpose !== "registration") {
      throw new Error("Invalid token purpose");
    }
    return payload;
  } catch (error) {
    throw new Error("Invalid or expired registration token");
  }
};
