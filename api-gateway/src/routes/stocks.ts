import { Router, Request, Response, NextFunction } from "express";
import { searchStocks, getKline } from "../dataServiceClient";

export const stocksRouter = Router();

// GET /api/stocks/search?keyword=xxx
stocksRouter.get("/search", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const keyword = (req.query.keyword as string | undefined)?.trim();
    if (!keyword) {
      return res.status(400).json({ error: "bad_request", message: "keyword is required" });
    }
    res.json(await searchStocks(keyword));
  } catch (err) {
    next(err);
  }
});

// GET /api/stocks/:code/kline?start=YYYY-MM-DD&end=YYYY-MM-DD&freq=d&adjust=none
stocksRouter.get("/:code/kline", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const codeParam = req.params.code;
    const code = (Array.isArray(codeParam) ? codeParam[0] : codeParam)?.trim();
    const start = req.query.start as string | undefined;
    const end = req.query.end as string | undefined;
    const freq = ((req.query.freq as string | undefined) ?? "d").trim();
    const adjust = ((req.query.adjust as string | undefined) ?? "none").trim();

    const allowedFreq = ["d", "w", "m"];
    const allowedAdjust = ["none", "qfq", "hfq"];
    if (!code) {
      return res.status(400).json({ error: "bad_request", message: "code is required" });
    }
    if (!allowedFreq.includes(freq)) {
      return res.status(400).json({ error: "bad_request", message: `freq must be one of ${allowedFreq.join(",")}` });
    }
    if (!allowedAdjust.includes(adjust)) {
      return res.status(400).json({ error: "bad_request", message: `adjust must be one of ${allowedAdjust.join(",")}` });
    }

    res.json(await getKline(code, { start, end, freq, adjust }));
  } catch (err) {
    next(err);
  }
});
