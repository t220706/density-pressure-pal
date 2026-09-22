import { z } from "zod";

export const EXPERIMENT_CODES = [
  "EXP-01",
  "EXP-02",
  "EXP-03",
  "EXP-04",
  "EXP-05",
] as const;

export const EXPERIMENT_LABELS: Record<string, string> = {
  "EXP-01": "Vật nổi, chìm, lơ lửng",
  "EXP-02": "Xác định khối lượng riêng của vật rắn",
  "EXP-03": "Áp suất do lực tác dụng",
  "EXP-04": "Áp suất chất lỏng theo độ sâu",
  "EXP-05": "Video ngoài phạm vi",
};

export const SOURCE_LABELS: Record<string, string> = {
  read_from_video: "Đọc từ video",
  user_input: "Người dùng nhập",
  not_readable_from_video: "Không xác định được từ video",
  assumed_for_illustration: "Giá trị giả định để minh họa",
};

export const analysisSchema = z.object({
  experiment_type: z.object({
    code: z.enum(EXPERIMENT_CODES),
    name: z.string(),
    confidence: z.number(),
    reason: z.string(),
  }),
  video_quality: z.object({
    level: z.enum(["tot", "trung_binh", "kem"]),
    note: z.string(),
  }),
  summary: z.string(),
  observations: z.array(
    z.object({
      time: z.string(),
      content: z.string(),
      confidence: z.number(),
    }),
  ),
  data: z.array(
    z.object({
      name: z.string(),
      symbol: z.string(),
      value: z.string().nullable(),
      unit: z.string(),
      source: z.enum([
        "read_from_video",
        "user_input",
        "not_readable_from_video",
        "assumed_for_illustration",
      ]),
      confidence: z.number(),
    }),
  ),
  missing_data: z.array(z.string()),
  formula: z.object({
    expression: z.string(),
    symbols: z.string(),
    conditions: z.string(),
  }),
  calculation: z.object({
    status: z.enum(["completed", "insufficient_data", "not_applicable"]),
    steps: z.array(z.string()),
    result: z.string().nullable(),
    message: z.string(),
  }),
  explanation: z.string(),
  conclusion: z.string(),
  limitations: z.array(z.string()),
  warnings: z.array(z.string()),
  questions: z.array(
    z.object({
      type: z.enum(["dinh_tinh", "tinh_toan"]),
      question: z.string(),
      answer_or_hint: z.string(),
    }),
  ),
});

export type Analysis = z.infer<typeof analysisSchema>;

export type MeasurementRow = {
  id: string;
  name: string;
  symbol: string;
  value: string;
  unit: string;
};
