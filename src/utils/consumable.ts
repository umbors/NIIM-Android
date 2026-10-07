import { CapacitorHttp } from "@capacitor/core";
import { LabelType, type PrinterModelMeta } from "@mmote/niimbluelib";
import { z } from "zod";
import type { LabelProps } from "$/types";

const catalogueSchema = z.object({
  barcode: z.string(),
  name: z.string().default("原装标签"),
  width: z.number().positive().max(1000),
  height: z.number().positive().max(1000),
  paperType: z.number().int(),
  isCable: z.boolean().optional(),
  inputAreas: z.array(z.object({
    x: z.number().nonnegative(), y: z.number().nonnegative(),
    w: z.number().positive(), h: z.number().positive(),
  })).optional(),
  profile: z.object({ isMultiRegionLabel: z.boolean().optional() }).optional(),
});
export type Consumable = z.infer<typeof catalogueSchema>;

export function parseConsumable(value: unknown, barcode: string): Consumable {
  const result = catalogueSchema.parse(value);
  if (result.barcode !== barcode) throw new Error("耗材目录编号不匹配");
  if (result.isCable || result.profile?.isMultiRegionLabel) {
    throw new Error("此耗材为线缆或多区域标签，请在标签规格中确认分区");
  }
  if (!Object.values(LabelType).includes(result.paperType)) throw new Error("未知纸张类型");
  return result;
}

export async function lookupConsumable(barcode: string): Promise<Consumable> {
  const key = "pocket-consumable-v1:" + barcode;
  try {
    const cached = localStorage.getItem(key);
    if (cached) return parseConsumable(JSON.parse(cached), barcode);
  } catch { /* Invalid or unavailable cache is treated as a miss. */ }
  // Send only the product code; never send tag UUID, serial, or label content.
  const response = await CapacitorHttp.post({
    url: "https://print.niimbot.com/api/template/getCloudTemplateByOneCode",
    headers: { "Content-Type": "application/json", "niimbot-user-agent": "AppVersionName/NiimPocket" },
    data: { oneCode: barcode }, connectTimeout: 10000, readTimeout: 10000,
  });
  if (response.status !== 200) throw new Error("耗材目录暂时无法访问");
  const body = typeof response.data === "string" ? JSON.parse(response.data) : response.data;
  if (!body?.data) throw new Error("目录中未找到此耗材，请手动确认标签规格");
  const result = parseConsumable(body.data, barcode);
  try { localStorage.setItem(key, JSON.stringify(result)); } catch { /* Storage may be full. */ }
  return result;
}

export function consumableLayout(stock: Consumable, meta: PrinterModelMeta): LabelProps {
  const dpmm = meta.dpi === 203 ? 8 : meta.dpi / 25.4;
  let width = Math.round(stock.width * dpmm);
  let height = Math.round(stock.height * dpmm);
  const head = meta.printDirection === "left" ? height : width;
  const aligned = Math.floor(head / 8) * 8;
  if (aligned < 8 || aligned > meta.printheadPixels) throw new Error("耗材宽度超出当前打印机范围，请确认纸卷");
  if (meta.printDirection === "left") height = aligned; else width = aligned;
  return { size: { width, height }, printDirection: meta.printDirection,
    shape: "rect", split: "none", mirror: "none", tailLength: 0 };
}
