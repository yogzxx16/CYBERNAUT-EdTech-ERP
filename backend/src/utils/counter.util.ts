import { Schema, model, type Model, type Document } from "mongoose";

interface CounterDoc extends Omit<Document, "_id"> {
  _id: string;
  seq: number;
}

const counterSchema = new Schema<CounterDoc>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const CounterModel: Model<CounterDoc> = model<CounterDoc>("Counter", counterSchema);

export const counterUtil = {
  async next(key: string): Promise<number> {
    const doc = await CounterModel.findByIdAndUpdate(
      key,
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    ).exec();
    return doc!.seq;
  },
};
