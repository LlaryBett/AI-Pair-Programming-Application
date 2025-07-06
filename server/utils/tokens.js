import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const generateJWT = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '48h' });
};

export const verifyToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};
