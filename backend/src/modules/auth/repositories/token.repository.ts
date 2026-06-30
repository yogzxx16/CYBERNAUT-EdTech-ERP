import { Schema, model, type Document, type Model, type Types } from "mongoose";
import { TOKEN_TYPES, type TokenType } from "../../../config/constants";

export interface TokenDoc extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  tokenHash: string;
  type: TokenType;
  expiresAt: Date;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const tokenSchema = new Schema<TokenDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    type: { type: String, enum: Object.values(TOKEN_TYPES), required: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// MongoDB TTL — auto-purge expired tokens
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const TokenModel: Model<TokenDoc> = model<TokenDoc>("Token", tokenSchema);

export const tokenRepository = {
  model: TokenModel,
  async create(input: {
    userId: string;
    tokenHash: string;
    type: TokenType;
    expiresAt: Date;
  }) {
    return TokenModel.create({
      user: input.userId,
      tokenHash: input.tokenHash,
      type: input.type,
      expiresAt: input.expiresAt,
    });
  },
  async findActive(tokenHash: string, type: TokenType) {
    return TokenModel.findOne({
      tokenHash,
      type,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).exec();
  },
  async revokeById(id: string) {
    return TokenModel.findByIdAndUpdate(id, { revokedAt: new Date() }, { new: true }).exec();
  },
  async revokeAllForUser(userId: string, type: TokenType) {
    return TokenModel.updateMany(
      { user: userId, type, revokedAt: null },
      { revokedAt: new Date() },
    ).exec();
  },
};
