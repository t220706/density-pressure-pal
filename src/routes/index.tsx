import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { analyzeExperiment } from "@/lib/analyze.functions";
import {
  EXPERIMENT_LABELS,
  SOURCE_LABELS,
  type Analysis,
  type MeasurementRow,
} from "@/lib/analysis-types";
import { extractFrames, formatTime, type Frame } from "@/lib/frames";
import { buildReport } from "@/lib/report";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Trợ lý AI phân tích video thí nghiệm KHTN 8" },
      {
        name: "description",
        content:
          "Tải video thí nghiệm chủ đề Áp suất (KHTN 8), AI nhận diện thí nghiệm, trích dữ liệu, tính toán và tạo báo cáo cho học sinh lớp 8.",
      },
      { property: "og:title", content: "Trợ lý AI phân tích video thí nghiệm KHTN 8" },
      {
        property: "og:description",
        content:
          "Phân tích video thí nghiệm áp suất: quan sát, dữ liệu, công thức, phép tính, báo cáo và câu hỏi luyện tập.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const UNITS = ["g", "kg", "cm³", "m³", "N", "cm²", "m²", "Pa", "cm", "m", "N/m³", "kg/m³"];

const label = "block text-sm font-medium text-foreground mb-1.5";
const input =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
const card = "rounded-xl border border-border bg-card p-5 shadow-sm";

function Pill({ children, tone = "muted" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    muted: "bg-muted text-muted-foreground",
    warn: "bg-accent/25 text-accent-foreground",
    ok: "bg-primary/12 text-primary",
  };
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

function Index() {
  const analyze = useServerFn(analyzeExperiment);
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [frames, setFrames] = useState<Frame[]>([]);
  const [duration, setDuration] = useState(0);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Analysis | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [note, setNote] = useState("");

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [liquid, setLiquid] = useState("");
  const [expectedType, setExpectedType] = useState("");
  const [hasReference, setHasReference] = useState(false);
  const [userNote, setUserNote] = useState("");
  const [question, setQuestion] = useState("");
  const [rows, setRows] = useState<MeasurementRow[]>([
    { id: "1", name: "Lực ép", symbol: "F", value: "", unit: "N" },
  ]);

  async function onPick(f: File | null) {
    setError("");
    setResult(null);
    setFrames([]);
    if (!f) return;
    if (!/\.(mp4|mov|webm)$/i.test(f.name) && !f.type.startsWith("video/")) {
      setError("Định dạng không hợp lệ. Hãy dùng MP4, MOV hoặc WEBM.");
      return;
    }
    setFile(f);
    setVideoUrl(URL.createObjectURL(f));
    setBusy(true);
    setStatus("Đang lấy khung hình tiêu biểu...");
    try {
      const { frames: fr, duration: d } = await extractFrames(f, 8, (done, total) =>
        setStatus(`Đang lấy khung hình ${done}/${total}...`),
      );
      setFrames(fr);
      setDuration(d);
      setStatus(
        d > 300
          ? "Video dài hơn 5 phút: kết quả có thể kém chính xác, nên cắt ngắn video."
          : `Đã lấy ${fr.length} khung hình. Bạn có thể nhập dữ liệu đo rồi bấm Phân tích.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được video.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  async function run() {
    if (!frames.length) {
      setError("Hãy tải lên một video thí nghiệm trước.");
      return;
    }
    setBusy(true);
    setError("");
    setResult(null);
    setStatus("AI đang phân tích video và dữ liệu...");
    try {
      const out = await analyze({
        data: {
          frames: frames.map((f) => ({ time: f.time, dataUrl: f.dataUrl })),
          experimentName: name,
          goal,
          liquid,
          hasReference,
          durationSeconds: duration,
          userNote,
          question,
          expectedType,
          measurements: rows
            .filter((r) => r.value.trim() !== "" && r.name.trim() !== "")
            .map(({ name: n, symbol, value, unit }) => ({ name: n, symbol, value, unit })),
        },
      });
      setResult(out as Analysis);
      setStatus("Đã có kết quả phân tích.");
    } catch (e) {
      setError(
        e instanceof Error
          ? `Phân tích thất bại: ${e.message}`
          : "Phân tích thất bại, hãy thử lại.",
      );
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  const report = result ? buildReport(result, { name, goal }) : "";

  function download() {
    const blob = new Blob([report], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bao-cao-thi-nghiem-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-5 py-6">
          <Pill tone="ok">KHTN 8 · STEM tích hợp AI</Pill>
          <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Trợ lý AI phân tích video thí nghiệm
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Chủ đề: Áp suất. AI mô tả hiện tượng, trích dữ liệu, chọn công thức, tính toán và tạo
            báo cáo — không tự bịa số liệu.
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-5 px-5 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <div className="space-y-5">
          {/* UI-01 */}
          <section className={card}>
            <h2 className="text-base font-semibold">1. Tải video thí nghiệm</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              MP4, MOV hoặc WEBM; nên quay cố định camera, đủ sáng, dài 10 giây – 5 phút và đặt
              thước chuẩn trong khung hình nếu cần đo kích thước.
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                void onPick(e.dataTransfer.files?.[0] ?? null);
              }}
              className="mt-3 cursor-pointer rounded-lg border-2 border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground hover:border-primary hover:bg-primary/5"
            >
              {file ? file.name : "Kéo thả video vào đây hoặc bấm để chọn file"}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={(e) => void onPick(e.target.files?.[0] ?? null)}
            />

            {videoUrl && (
              <div className="mt-4 space-y-3">
                <video src={videoUrl} controls className="w-full rounded-lg border border-border" />
                {frames.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Các mốc AI đã chọn ({formatTime(duration)} tổng thời lượng)
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {frames.map((f) => (
                        <figure key={f.time} className="shrink-0">
                          <img
                            src={f.dataUrl}
                            alt={`Khung hình ${f.time}`}
                            className="h-16 w-28 rounded border border-border object-cover"
                          />
                          <figcaption className="mt-1 text-center text-[11px] text-muted-foreground">
                            {f.time}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* UI-02 */}
          <section className={card}>
            <h2 className="text-base font-semibold">2. Thông tin thí nghiệm</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <span className={label}>Tên thí nghiệm</span>
                <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <span className={label}>Mục tiêu</span>
                <input className={input} value={goal} onChange={(e) => setGoal(e.target.value)} />
              </div>
              <div>
                <span className={label}>Chất lỏng sử dụng</span>
                <input
                  className={input}
                  placeholder="ví dụ: nước"
                  value={liquid}
                  onChange={(e) => setLiquid(e.target.value)}
                />
              </div>
              <div>
                <span className={label}>Nhóm thí nghiệm (nếu biết)</span>
                <select
                  className={input}
                  value={expectedType}
                  onChange={(e) => setExpectedType(e.target.value)}
                >
                  <option value="">Để AI tự nhận diện</option>
                  {Object.entries(EXPERIMENT_LABELS).map(([code, text]) => (
                    <option key={code} value={`${code} – ${text}`}>
                      {code} – {text}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasReference}
                onChange={(e) => setHasReference(e.target.checked)}
              />
              Trong video có thước chuẩn / vật chuẩn biết trước kích thước
            </label>
            <div className="mt-3">
              <span className={label}>Ghi chú thêm</span>
              <textarea
                className={input}
                rows={2}
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
              />
            </div>
            <div className="mt-3">
              <span className={label}>Câu hỏi của em</span>
                <input
                  className={input}
                  placeholder="Ví dụ: Vì sao mũi đinh nhọn dễ đâm vào gỗ hơn?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                />
            </div>
          </section>

          {/* UI-05 */}
          <section className={card}>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">3. Dữ liệu đo của em</h2>
              <button
                type="button"
                onClick={() =>
                  setRows((r) => [
                    ...r,
                    { id: String(Date.now()), name: "", symbol: "", value: "", unit: "g" },
                  ])
                }
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                + Thêm dòng
              </button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Bỏ trống cũng được — AI sẽ ghi “chưa có dữ liệu” thay vì tự đoán.
            </p>
            <div className="mt-3 space-y-2">
              {rows.map((r, i) => (
                <div key={r.id} className="grid grid-cols-12 gap-2">
                  <input
                    className={`${input} col-span-4`}
                    placeholder="Đại lượng"
                    value={r.name}
                    onChange={(e) =>
                      setRows((x) =>
                        x.map((y, j) => (j === i ? { ...y, name: e.target.value } : y)),
                      )
                    }
                  />
                  <input
                    className={`${input} col-span-2`}
                    placeholder="KH"
                    value={r.symbol}
                    onChange={(e) =>
                      setRows((x) =>
                        x.map((y, j) => (j === i ? { ...y, symbol: e.target.value } : y)),
                      )
                    }
                  />
                  <input
                    className={`${input} col-span-3`}
                    placeholder="Giá trị"
                    value={r.value}
                    onChange={(e) =>
                      setRows((x) =>
                        x.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)),
                      )
                    }
                  />
                  <select
                    className={`${input} col-span-2`}
                    value={r.unit}
                    onChange={(e) =>
                      setRows((x) =>
                        x.map((y, j) => (j === i ? { ...y, unit: e.target.value } : y)),
                      )
                    }
                  >
                    {UNITS.map((u) => (
                      <option key={u}>{u}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label="Xoá dòng"
                    onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
                    className="col-span-1 rounded-md border border-border text-sm text-muted-foreground hover:bg-muted"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void run()}
              className="mt-4 w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "Đang xử lý..." : "Phân tích video"}
            </button>
            {status && <p className="mt-2 text-xs text-muted-foreground">{status}</p>}
            {error && (
              <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}
          </section>
        </div>

        {/* Results */}
        <div className="space-y-5">
          {!result && (
            <section className={`${card} text-sm text-muted-foreground`}>
              <h2 className="text-base font-semibold text-foreground">Kết quả phân tích</h2>
              <p className="mt-2">
                Kết quả sẽ hiện ở đây: nhận dạng thí nghiệm, quan sát theo mốc thời gian, bảng dữ
                liệu kèm nguồn, công thức, các bước tính, giải thích, kết luận, sai số và câu hỏi
                luyện tập.
              </p>
              <p className="mt-2">
                AI chỉ hỗ trợ diễn giải. Em vẫn phải đối chiếu với số đo thật và hướng dẫn của thầy
                cô.
              </p>
            </section>
          )}

          {result && (
            <>
              <section className={card}>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="ok">{result.experiment_type.code}</Pill>
                  <span className="font-semibold">{result.experiment_type.name}</span>
                  <Pill tone={result.experiment_type.confidence >= 0.7 ? "ok" : "warn"}>
                    Tin cậy {Math.round(result.experiment_type.confidence * 100)}%
                  </Pill>
                  <Pill tone={result.video_quality.level === "tot" ? "ok" : "warn"}>
                    Chất lượng video: {result.video_quality.level.replace("_", " ")}
                  </Pill>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{result.experiment_type.reason}</p>
                <p className="mt-1 text-xs text-muted-foreground">{result.video_quality.note}</p>
                <h3 className="mt-4 text-sm font-semibold">Tóm tắt video</h3>
                <p className="mt-1 text-sm">{result.summary}</p>
              </section>

              {result.warnings.length > 0 && (
                <section className="rounded-xl border border-accent/50 bg-accent/15 p-5">
                  <h3 className="text-sm font-semibold">⚠️ Cảnh báo</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {result.warnings.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </section>
              )}

              <section className={card}>
                <h3 className="text-sm font-semibold">Quan sát được</h3>
                <table className="mt-2 w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1">Mốc</th>
                      <th className="py-1">Quan sát</th>
                      <th className="py-1">Tin cậy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.observations.map((o, i) => (
                      <tr key={i} className="border-t border-border align-top">
                        <td className="py-1.5 pr-2 whitespace-nowrap">{o.time}</td>
                        <td className="py-1.5 pr-2">{o.content}</td>
                        <td className="py-1.5">{Math.round(o.confidence * 100)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>

              <section className={card}>
                <h3 className="text-sm font-semibold">Bảng dữ liệu</h3>
                <table className="mt-2 w-full text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1">Đại lượng</th>
                      <th className="py-1">Giá trị</th>
                      <th className="py-1">Nguồn</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((d, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-1.5">
                          {d.name} <span className="text-muted-foreground">({d.symbol})</span>
                        </td>
                        <td className="py-1.5">
                          {d.value === null ? (
                            <span className="text-muted-foreground">chưa có</span>
                          ) : (
                            `${d.value} ${d.unit}`
                          )}
                        </td>
                        <td className="py-1.5 text-xs">
                          <Pill tone={d.source === "read_from_video" ? "ok" : "muted"}>
                            {SOURCE_LABELS[d.source] ?? d.source}
                          </Pill>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.missing_data.length > 0 && (
                  <div className="mt-3 text-sm">
                    <p className="font-medium">Dữ liệu còn thiếu để tính toán:</p>
                    <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                      {result.missing_data.map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <section className={card}>
                <h3 className="text-sm font-semibold">Công thức và phép tính</h3>
                <p className="mt-2 rounded-md bg-muted px-3 py-2 font-mono text-sm">
                  {result.formula.expression}
                </p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">Ký hiệu:</span> {result.formula.symbols}
                </p>
                <p className="mt-1 text-sm">
                  <span className="font-medium">Điều kiện áp dụng:</span> {result.formula.conditions}
                </p>
                {result.calculation.steps.length > 0 && (
                  <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm">
                    {result.calculation.steps.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                )}
                <p
                  className={`mt-3 rounded-md px-3 py-2 text-sm font-semibold ${
                    result.calculation.status === "completed"
                      ? "bg-primary/12 text-primary"
                      : "bg-accent/25 text-accent-foreground"
                  }`}
                >
                  {result.calculation.result ?? result.calculation.message}
                </p>
              </section>

              <section className={card}>
                <h3 className="text-sm font-semibold">Giải thích</h3>
                <p className="mt-1 text-sm">{result.explanation}</p>
                <h3 className="mt-4 text-sm font-semibold">Kết luận</h3>
                <p className="mt-1 rounded-md border-l-4 border-primary bg-primary/5 px-3 py-2 text-sm">
                  {result.conclusion}
                </p>
                <h3 className="mt-4 text-sm font-semibold">Sai số và hạn chế</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {result.limitations.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </section>

              <section className={card}>
                <h3 className="text-sm font-semibold">Câu hỏi luyện tập</h3>
                <div className="mt-2 space-y-3">
                  {result.questions.map((q, i) => (
                    <details key={i} className="rounded-md border border-border p-3">
                      <summary className="cursor-pointer text-sm font-medium">
                        {i + 1}. {q.question}{" "}
                        <Pill>{q.type === "tinh_toan" ? "Tính toán" : "Định tính"}</Pill>
                      </summary>
                      <p className="mt-2 text-sm text-muted-foreground">{q.answer_or_hint}</p>
                    </details>
                  ))}
                </div>
              </section>

              <section className={card}>
                <h3 className="text-sm font-semibold">Báo cáo</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => void navigator.clipboard.writeText(report)}
                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Sao chép Markdown
                  </button>
                  <button
                    onClick={download}
                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Tải file .md
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    In / Lưu PDF
                  </button>
                </div>
                <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
                  {report}
                </pre>
              </section>

              <section className={card}>
                <h3 className="text-sm font-semibold">Phản hồi của em về kết quả AI</h3>
                <div className="mt-2 flex gap-2">
                  {["AI đúng", "AI cần sửa"].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFeedback(f)}
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        feedback === f
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
                <textarea
                  className={`${input} mt-2`}
                  rows={2}
                  placeholder="Ghi chú cho giáo viên..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                {feedback && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Đã ghi nhận phản hồi “{feedback}” trong phiên làm việc này.
                  </p>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <footer className="border-t border-border bg-card py-5 text-center text-xs text-muted-foreground">
        Trợ lý AI hỗ trợ phân tích, không thay thế phép đo thực nghiệm. Luôn đối chiếu với số đo và
        hướng dẫn của giáo viên.
      </footer>
    </div>
  );
}
