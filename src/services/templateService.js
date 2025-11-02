import templates from "../models/objectTemplates.js";

export function sendTemplate(ws, t) {
  ws.send(JSON.stringify({
    type: "obj_tpl",
    tpl: t.tpl,
    name: t.name,
    desc: t.desc,
    stack: t.stack ? 1 : 0,
    pickup: t.pickup ? 1 : 0,
    block: t.block ? 1 : 0,
    spr: t.spr,
    build: t.build || ""
  }));
}

export function sendAllTemplates(ws) {
  for (const t of templates) sendTemplate(ws, t);
}

export function findTemplate(tpl) {
  return templates.find(t => t.tpl === tpl);
}

export { templates };