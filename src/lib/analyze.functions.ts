import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText, Output } from "ai";
import { z } from "zod";
import { analysisSchema } from "./analysis-types";
import { createLovableAiGatewayRunIdFetch } from "./ai-gateway.server";

const SYSTEM_PROMPT = `Bạn là trợ lý AI hỗ trợ dạy học môn Khoa học tự nhiên 8, chủ đề Khối lượng riêng và Áp suất.

Bạn nhận được một số khung hình trích từ video thí nghiệm (kèm mốc thời gian) và dữ liệu do người dùng nhập. Hãy thực hiện theo thứ tự:
1. Xác định video thuộc nhóm nào: EXP-03 áp suất do lực tác dụng; EXP-04 áp suất chất lỏng theo độ sâu; EXP-05 ngoài phạm vi. Nếu video là thí nghiệm khác (ví dụ vật nổi - chìm - lơ lửng, xác định khối lượng riêng), luôn xếp vào EXP-05 ngoài phạm vi.
2. Mô tả khách quan những gì quan sát được, kèm mốc thời gian. Chỉ ghi điều thực sự nhìn thấy.
3. Liệt kê dữ liệu: giá trị, đơn vị, nguồn (read_from_video | user_input | not_readable_from_video | assumed_for_illustration) và mức tin cậy.
4. Liệt kê dữ liệu còn thiếu nếu muốn tính toán.
5. Chọn công thức phù hợp (p = F/S, p = d.h), giải thích ký hiệu và điều kiện áp dụng.
6. Tính toán từng bước nếu dữ liệu đủ; đổi đơn vị về SI trước khi tính. Không tự tạo hoặc đoán số liệu.
7. Giải thích hiện tượng bằng ngôn ngữ học sinh lớp 8, câu ngắn.
8. Kết luận ngắn gọn, chỉ dựa trên dữ liệu có căn cứ.
9. Nêu tối đa 5 nguyên nhân sai số và giới hạn của phân tích video.
10. Tạo tối thiểu 3 câu hỏi TRẮC NGHIỆM luyện tập: ít nhất 1 câu định tính, và 1 câu tính toán nếu đủ dữ liệu. Mỗi câu có đúng 4 lựa chọn (A, B, C, D), chỉ MỘT đáp án đúng; nêu đúng đáp án trong correct_label và viết giải thích ngắn vì sao đáp án đó đúng (explanation). Các lựa chọn nhiễu phải hợp lý, không quá dễ loại.

Quy tắc bắt buộc:
- Không bịa số đo. Nếu không đọc được, dùng value = null và source = "not_readable_from_video".
- Nếu thiếu dữ liệu, calculation.status = "insufficient_data" và message phải chứa: "Chưa đủ dữ liệu để kết luận định lượng".
- Không gán vật liệu/chất lỏng nếu video không có căn cứ.
- Kiểm tra đơn vị và tính hợp lý (giá trị âm, bằng 0 vô lý, sai đơn vị) trước khi tính; nếu có vấn đề, ghi vào warnings.
- Nếu nhận diện không chắc chắn, hạ confidence và ghi cảnh báo yêu cầu người dùng kiểm tra.
- Nhắc người học đối chiếu kết quả với số đo thực tế và hướng dẫn của giáo viên.
- Toàn bộ nội dung trả lời bằng tiếng Việt.`;

const InputSchema = z.object({
  frames: z.array(z.object({ time: z.string(), dataUrl: z.string() })).min(1).max(12),
  experimentName: z.string(),
  goal: z.string(),
  liquid: z.string(),
  hasReference: z.boolean(),
  durationSeconds: z.number(),
  userNote: z.string(),
  question: z.string(),
  expectedType: z.string(),
  measurements: z.array(
    z.object({ name: z.string(), symbol: z.string(), value: z.string(), unit: z.string() }),
  ),
});

export const analyzeExperiment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    // Priority: OPENAI_API_KEY > XAI_API_KEY > GEMINI_API_KEY (Vercel) > LOVABLE_API_KEY (Lovable hosting).
    const openaiKey = process.env["OPENAI_API_KEY"];
    const xaiKey = process.env["XAI_API_KEY"];
    const geminiKey = process.env["GEMINI_API_KEY"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const key = openaiKey || xaiKey || geminiKey || lovableKey;
    if (!key)
      throw new Error(
        "Thiếu khóa AI. Hãy thêm OPENAI_API_KEY, XAI_API_KEY hoặc GEMINI_API_KEY vào biến môi trường.",
      );

    const useOpenAI = Boolean(openaiKey);
    const useXai = !useOpenAI && Boolean(xaiKey);
    const useGemini = !useOpenAI && !useXai && Boolean(geminiKey);
    const runIdFetch = createLovableAiGatewayRunIdFetch();
    const gemini = useGemini ? createGoogleGenerativeAI({ apiKey: key }) : null;
    const plainModel = !useOpenAI && (useXai || useGemini);
    const model = gemini
      ? gemini(process.env["AI_MODEL"] || "gemini-2.5-flash")
      : useXai
        ? createOpenAI({ apiKey: key, baseURL: "https://api.x.ai/v1" }).chat(
            process.env["AI_MODEL"] || "grok-4-fast",
          )
        : useOpenAI
          ? createOpenAI({ apiKey: key }).responses(process.env["AI_MODEL"] || "gpt-5-mini")
          : createOpenAI({
              baseURL: "https://ai.gateway.lovable.dev/v1",
              apiKey: key,
              headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
              fetch: runIdFetch.fetch,
            }).responses("openai/gpt-6-astra");

    const measurementText = data.measurements.length
      ? data.measurements
          .map((m) => `- ${m.name} (${m.symbol}): ${m.value} ${m.unit} [người dùng nhập]`)
          .join("\n")
      : "Người dùng chưa nhập số đo nào.";

    const context = [
      `Tên thí nghiệm: ${data.experimentName || "không cung cấp"}`,
      `Mục tiêu: ${data.goal || "không cung cấp"}`,
      `Loại chất lỏng: ${data.liquid || "không cung cấp"}`,
      `Có thước chuẩn/vật chuẩn trong khung hình: ${data.hasReference ? "có" : "không / không rõ"}`,
      `Thời lượng video: ${Math.round(data.durationSeconds)} giây`,
      `Người dùng gợi ý nhóm thí nghiệm: ${data.expectedType || "để AI tự nhận diện"}`,
      `Ghi chú thêm: ${data.userNote || "không có"}`,
      `Câu hỏi của học sinh: ${data.question || "không có"}`,
      `Dữ liệu đo người dùng nhập:\n${measurementText}`,
      data.hasReference
        ? ""
        : "Lưu ý: không có thước chuẩn, mọi ước lượng kích thước từ hình ảnh chỉ là tương đối, phải cảnh báo.",
    ]
      .filter(Boolean)
      .join("\n");

    const result = streamText({
      model,
      system: SYSTEM_PROMPT,
      output: Output.object({ schema: analysisSchema }),
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Đây là ${data.frames.length} khung hình trích từ video thí nghiệm, theo thứ tự thời gian: ${data.frames
                .map((f) => f.time)
                .join(", ")}.\n\n${context}\n\nHãy phân tích theo đúng quy trình và trả về JSON theo schema.`,
            },
            ...data.frames.map((f) => ({ type: "image" as const, image: f.dataUrl })),
          ],
        },
      ],
      // OpenAI-specific options; Gemini rejects these.
      ...(gemini
        ? {}
        : {
            providerOptions: {
              openai: {
                forceReasoning: true,
                reasoningEffort: "low" as const,
                reasoningSummary: "auto" as const,
                store: false,
                include: ["reasoning.encrypted_content"],
              },
            },
          }),
    });

    return await result.output;
  });
