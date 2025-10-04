import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";

export const config = { api: { bodyParser: false } };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  const form = formidable({ multiples: false });
  form.parse(req, async (err, fields, files: any) => {
    if (err) return res.status(400).json({ error: "Upload parse error" });
    try {
      if (!files?.file?.filepath) return res.status(400).json({ error: "Missing file" });

      const buffer = fs.readFileSync(files.file.filepath);

      // 1) Whisper transcription
      const fd = new FormData();
      fd.append("file", new Blob([buffer]), "reflection.webm");
      fd.append("model", "whisper-1");

      const wr = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
        body: fd,
      });
      if (!wr.ok) {
        const t = await wr.text();
        return res.status(502).json({ error: "Whisper failed", detail: t });
      }
      const wj = await wr.json();
      const text: string | undefined = wj.text?.trim();
      if (!text) return res.status(500).json({ error: "No transcription text" });

      // 2) Pull-quote via GPT
      const gr = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Extract one short, evocative pull-quote (≤14 words) from the reflection below. Return just the quote with no extra text." },
            { role: "user", content: text },
          ],
          temperature: 0.7,
        }),
      });
      if (!gr.ok) {
        const t = await gr.text();
        return res.status(502).json({ error: "GPT failed", detail: t });
      }
      const gj = await gr.json();
      const pullQuote: string = gj.choices?.[0]?.message?.content?.trim() || "";

      res.status(200).json({ text, pullQuote });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message || "Server error" });
    }
  });
}