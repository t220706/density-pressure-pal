import type { Analysis } from "./analysis-types";
import { SOURCE_LABELS } from "./analysis-types";

export function buildReport(a: Analysis, meta: { name: string; goal: string }) {
  const lines: string[] = [];
  lines.push(`# Báo cáo phân tích thí nghiệm`);
  lines.push("");
  lines.push(`**Tên thí nghiệm:** ${meta.name || "(chưa đặt tên)"}`);
  lines.push(`**Mục tiêu:** ${meta.goal || "(chưa nêu)"}`);
  lines.push(
    `**Nhóm thí nghiệm nhận diện:** ${a.experiment_type.code} – ${a.experiment_type.name} (tin cậy ${Math.round(
      a.experiment_type.confidence * 100,
    )}%)`,
  );
  lines.push(`**Lý do nhận diện:** ${a.experiment_type.reason}`);
  lines.push("");
  lines.push(`## 1. Tóm tắt video`);
  lines.push(a.summary);
  lines.push("");
  lines.push(`## 2. Quan sát được`);
  lines.push(`| Mốc thời gian | Quan sát | Tin cậy |`);
  lines.push(`|---|---|---|`);
  a.observations.forEach((o) =>
    lines.push(`| ${o.time} | ${o.content} | ${Math.round(o.confidence * 100)}% |`),
  );
  lines.push("");
  lines.push(`## 3. Dữ liệu`);
  lines.push(`| Đại lượng | Ký hiệu | Giá trị | Đơn vị | Nguồn | Tin cậy |`);
  lines.push(`|---|---|---|---|---|---|`);
  a.data.forEach((d) =>
    lines.push(
      `| ${d.name} | ${d.symbol} | ${d.value ?? "chưa có"} | ${d.unit} | ${
        SOURCE_LABELS[d.source] ?? d.source
      } | ${Math.round(d.confidence * 100)}% |`,
    ),
  );
  if (a.missing_data.length) {
    lines.push("");
    lines.push(`**Dữ liệu còn thiếu:**`);
    a.missing_data.forEach((m) => lines.push(`- ${m}`));
  }
  lines.push("");
  lines.push(`## 4. Công thức`);
  lines.push(`\`${a.formula.expression}\``);
  lines.push("");
  lines.push(`- Ký hiệu: ${a.formula.symbols}`);
  lines.push(`- Điều kiện áp dụng: ${a.formula.conditions}`);
  lines.push("");
  lines.push(`## 5. Phép tính`);
  if (a.calculation.steps.length) {
    a.calculation.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  }
  lines.push("");
  lines.push(`**Kết quả:** ${a.calculation.result ?? a.calculation.message}`);
  lines.push("");
  lines.push(`## 6. Giải thích`);
  lines.push(a.explanation);
  lines.push("");
  lines.push(`## 7. Kết luận`);
  lines.push(`> ${a.conclusion}`);
  lines.push("");
  lines.push(`## 8. Sai số và hạn chế`);
  a.limitations.forEach((l) => lines.push(`- ${l}`));
  if (a.warnings.length) {
    lines.push("");
    lines.push(`## 9. Cảnh báo`);
    a.warnings.forEach((w) => lines.push(`- ⚠️ ${w}`));
  }
  lines.push("");
  lines.push(`## 10. Câu hỏi luyện tập`);
  lines.push(`| Câu hỏi | Đáp án / Gợi ý |`);
  lines.push(`|---|---|`);
  a.questions.forEach((q) => lines.push(`| ${q.question} | ${q.answer_or_hint} |`));
  lines.push("");
  lines.push(
    `_Lưu ý: Kết quả do AI tạo sinh. Hãy đối chiếu với số đo thực tế và hướng dẫn của giáo viên._`,
  );
  return lines.join("\n");
}
