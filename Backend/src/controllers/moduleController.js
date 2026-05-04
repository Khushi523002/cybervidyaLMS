import { Module } from "../models/Module.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { HttpError } from "../utils/httpError.js";
import { parseWorkbook } from "../utils/excelParser.js";
import { serializeModule } from "../utils/serializers.js";

export const listModules = asyncHandler(async (_req, res) => {
  const modules = await Module.find().sort({ uploadedAt: 1 }).lean();
  res.json({ data: modules.map(serializeModule) });
});

export const uploadModules = asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, "Upload an Excel file.");

  const parsedModules = parseWorkbook(req.file.buffer);
  const saved = [];

  for (const parsed of parsedModules) {
    const module = await Module.findOneAndUpdate(
      { moduleId: parsed.moduleId },
      {
        ...parsed,
        uploadedByUserId: req.user.id,
        uploadedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    saved.push(module);
  }

  res.json({
    message: `${saved.length} module${saved.length === 1 ? "" : "s"} uploaded.`,
    data: saved.map(serializeModule),
  });
});

export const deleteModule = asyncHandler(async (req, res) => {
  await Module.deleteOne({ moduleId: req.params.id });
  res.json({ message: "Module removed." });
});
