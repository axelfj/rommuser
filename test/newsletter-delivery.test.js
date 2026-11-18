import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, it, expect } from 'vitest';
const source = ['fans-sheet.gs', 'newsletter.gs'].map(f => readFileSync(new URL('../integraciones/' + f, import.meta.url), 'utf8')).join('\n');
function sheet(data) {
  return { data, getLastRow: () => data.length, appendRow: row => data.push(row), getRange(row, col, height = 1, width = 1) {
    return {getValues: () => data.slice(row - 1, row - 1 + height).map(r => Array.from({length: width}, (_, i) => r[col - 1 + i] ?? '')),
      getValue: () => data[row - 1][col - 1], setValue(v) {data[row - 1][col - 1] = v;}};
  }};
}
function load() {
  const sheets = { Fans: sheet([['headers']]), Bajas: sheet([['headers']]), 'Envíos': sheet([['headers']]), 'Campañas': sheet([['headers'], ['C1','Subject','Fans','ES','','APROBADA',0,'']]) };
  const notifications = [];
  const ctx = {SpreadsheetApp: {getActive: () => ({getSheetByName: n => sheets[n]})}, LockService: {getScriptLock: () => ({tryLock: () => true, releaseLock() {}})}, Utilities: {formatDate: () => 'now'}, MailApp: {sendEmail: (...args) => notifications.push(args)}};
  runInNewContext(source, ctx);
  ctx.template_ = () => ({}); ctx.nlRoomToday_ = () => 40; ctx.nlUse_ = () => {};
  ctx.pendingFor_ = () => ctx.sentFor_('C1').has('fan@example.test') ? [] : [{email:'fan@example.test', segmento:'Fans'}];
  return {ctx, sheets, notifications};
}
describe('newsletter delivery regressions', () => {
  it('retries a failure, counts only success and does not duplicate success', () => {
    const {ctx,sheets,notifications} = load(); let attempts=0;
    ctx.sendOne_ = () => {if (++attempts === 1) throw new Error('temporary');};
    ctx.sendQueue(); expect(sheets['Campañas'].data[1][5]).toBe('ENVIANDO'); expect(sheets['Campañas'].data[1][6]).toBe(0);
    ctx.sendQueue(); expect(sheets['Campañas'].data[1][5]).toBe('ENVIADA'); expect(sheets['Campañas'].data[1][6]).toBe(1);
    ctx.sendQueue(); expect(attempts).toBe(2); expect(notifications).toHaveLength(1);
  });
  it('stops after three failed attempts and never claims completion', () => {
    const {ctx,sheets,notifications} = load(); let attempts=0; ctx.sendOne_=()=>{attempts++; throw new Error('failed');};
    for(let i=0;i<5;i++) ctx.sendQueue();
    expect(attempts).toBe(3); expect(sheets['Campañas'].data[1][5]).toBe('ERROR'); expect(notifications).toHaveLength(0);
  });
  it('ignores Error log rows and normalizes successful recipients', () => {
    const {ctx,sheets}=load(); sheets['Envíos'].data.push(['date','C1','other@example.test','Fans','Error: failed'],['date','C1',' FAN@example.test ','Fans','Enviado']);
    expect([...ctx.sentFor_('C1')]).toEqual(['fan@example.test']);
  });
  it('skips unsubscribed pending fans without reserving quota', () => {
    const {ctx,sheets}=load();
    sheets.Fans.data.push(['','state@example.test','ES','','Bienvenida pendiente','','','','','Baja'],['','list@example.test','ES','','Bienvenida pendiente','','','','','Activo'],['','active@example.test','EN','','Bienvenida pendiente','','','','','Activo']);
    sheets.Bajas.data.push(['','list@example.test','']); const sent=[]; ctx.welcomeRow_=(_s,_r,email,lang)=>{sent.push([email,lang]);return true;}; ctx.sendPending();
    expect(sent).toEqual([['active@example.test','en']]);
  });
  it('cancels the queued welcome when processing a withdrawal', () => {
    const {ctx,sheets}=load(); sheets.Fans.data.push(['','fan@example.test','ES','','Bienvenida pendiente','','','','','Activo']);
    ctx.addBaja_('fan@example.test','requested'); expect(sheets.Fans.data[1][9]).toBe('Baja'); expect(sheets.Fans.data[1][4]).toBe('Bienvenida cancelada por baja');
  });
});
