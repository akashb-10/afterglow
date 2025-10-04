import type { NextApiRequest, NextApiResponse } from "next";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { renderMedia } from "@remotion/renderer";
import { bundle } from "@remotion/bundler";
import path from "path";
import fs from "fs";
import os from "os";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import { moodPalette } from "@/lib/moodPalette"; // OPTIONAL: use if you created this file

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { reflectionId, filmTitle, director, year, posterUrl, pullQuote, mood } = req.body || {};
    if (!filmTitle || !posterUrl || !pullQuote) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // (Optional) palette lookup for aura/badge colors
    const palette = (moodPalette as any)?.[mood] || {
      aura: ["rgba(255,200,150,0.6)", "rgba(0,0,0,0)"],
      badge: ["#a78bfa", "#6366f1"],
    };

    // ---------- 1) PNG via Puppeteer ----------
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920 });
    await page.setContent(`
      <html><head>
        <meta charset="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&display=swap">
        <style>html,body{margin:0;padding:0}</style>
      </head><body>
        <div style="
          width:1080px;height:1920px;position:relative;overflow:hidden;
          background:#000;color:#fff;font-family:'Playfair Display',serif;
        ">
          <img src="${posterUrl}" style="
            position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.7" />
          <div style="
            position:absolute;inset:0;
            background: radial-gradient(circle, ${palette.aura[0]} 0%, ${palette.aura[1]} 70%);
            filter: blur(120px);
          "></div>
          <div style="position:absolute;top:40%;left:50%;transform:translate(-50%,-50%);padding:60px;text-align:center">
            <blockquote style="font-size:64px;line-height:1.2;text-shadow:0 0 20px rgba(0,0,0,.6)">“${escapeHtml(
              String(pullQuote)
            )}”</blockquote>
          </div>
          <div style="position:absolute;bottom:100px;left:80px;right:80px;display:flex;justify-content:space-between;align-items:center">
            <div>
              <p style="font-size:42px;margin:0">${escapeHtml(String(filmTitle))}</p>
              <p style="font-size:24px;margin:0;opacity:.7">${escapeHtml(String(director || ""))} · ${escapeHtml(
      String(year || "")
    )}</p>
            </div>
            <span style="
              padding:16px 24px;border-radius:9999px;
              background:linear-gradient(90deg, ${palette.badge[0]}, ${palette.badge[1]});
              color:#000;font-weight:700;font-size:22px;
            ">${escapeHtml(String(mood || ""))}</span>
          </div>
        </div>
      </body></html>
    `);

    const pngBuffer = await page.screenshot({ type: "png" });
    await browser.close();

    const pngKey = `cards/static/${reflectionId || uuidv4()}.png`;
    const up1 = await supabase.storage.from("cards").upload(pngKey, pngBuffer, {
      contentType: "image/png",
      upsert: true,
    });
    if (up1.error) throw up1.error;
    const { data: pngURL } = supabase.storage.from("cards").getPublicUrl(pngKey);

    // ---------- 2) MP4 via Remotion ----------
    const entry = path.join(process.cwd(), "remotion", "src", "Root.tsx");
    const serveUrl = await bundle(entry);
    const outPath = path.join(os.tmpdir(), `${uuidv4()}.mp4`);

    await renderMedia({
      serveUrl,
      composition: "FallbackCard", // or "CinematicCard" if you created it
      codec: "h264",
      inputProps: { posterUrl, pullQuote, filmTitle, director, year, mood },
      outputLocation: outPath,
    });

    const mp4Buffer = fs.readFileSync(outPath);
    const mp4Key = `cards/animated/${reflectionId || uuidv4()}.mp4`;
    const up2 = await supabase.storage.from("cards").upload(mp4Key, mp4Buffer, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (up2.error) throw up2.error;
    const { data: mp4URL } = supabase.storage.from("cards").getPublicUrl(mp4Key);

    res.status(200).json({ staticUrl: pngURL.publicUrl, animatedUrl: mp4URL.publicUrl });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message || "Render server error" });
  }
}

// Simple HTML escape to avoid breaking the PNG HTML
function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}