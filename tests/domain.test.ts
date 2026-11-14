import { describe, it, expect } from 'vitest';
import { parseNote, captureNote, taskState, templateTarget, parseHomebase, updateWidget, formatPhone } from '../src/domain';
describe('daily behavior', () => {
 it('captures a contact with only a phone number', () => {
  const note = parseNote(captureNote('contact', {phone:'555-0101'}));
  expect(note.properties.phone).toBe('555-0101'); expect(note.properties.type).toBe('contact');
 });
 it('formats North American contact numbers without changing other formats', () => {
  expect(formatPhone('(202) 555 0100')).toBe('202-555-0100');
  expect(formatPhone('1 202 555 0100')).toBe('+1 202-555-0100');
  expect(formatPhone('+1 (202) 555-0100')).toBe('+1 202-555-0100');
  expect(formatPhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
  expect(formatPhone('202-555-0100 x123')).toBe('202-555-0100 x123');
  expect(parseNote(captureNote('contact',{name:'Alex',phone:'12025550100'})).properties.phone).toBe('+1 202-555-0100');
 });
 it('rejects empty contacts and unsafe links', () => {
  expect(()=>captureNote('contact', {})).toThrow();
  expect(()=>captureNote('link', {url:'javascript:alert(1)'})).toThrow();
 });
 it('retains all-day event dates without UTC conversion', () => {
  expect(parseNote(captureNote('event',{title:'Birthday',date:'2026-11-11',allDay:true})).properties.date).toBe('2026-11-11');
 });
 it('rolls tasks forward without changing their due date', () => {
  const p={type:'task',due:'2026-11-10',planned:'2026-11-10',completed:false};
  expect(taskState(p,'2026-11-11')).toEqual({visible:true,overdue:true});
  expect(p.due).toBe('2026-11-10');
  expect(taskState({...p,planned:'2026-11-20'},'2026-11-11').visible).toBe(false);
  expect(taskState({...p,planned:undefined,due:'2026-11-20'},'2026-11-11').visible).toBe(true);
 });
 it('uses stable daily and ISO weekly filenames', () => {
  expect(templateTarget('Journal','{{date}}','daily',new Date(2026,10,11))).toBe('Journal/2026-11-11.md');
  expect(templateTarget('Journal','{{date}}','weekly',new Date(2027,0,1))).toBe('Journal/2026-W53.md');
 });
 it('preserves unsupported widgets and surrounding Markdown when arranging', () => {
  const source='# Home\n\n```lifeos\n{"id":"a","type":"tasks","width":"half"}\n```\n\nKeep me\n\n```lifeos\n{"id":"b","type":"future"}\n```';
  const result=updateWidget(source,'a',{hidden:true});
  expect(result).toContain('Keep me'); expect(result).toContain('"type":"future"');
  expect(parseHomebase(result).find(x=>x.widget?.id==='a')?.widget?.hidden).toBe(true);
 });
});
import { eventWhen, patchProperties } from '../src/domain';
it('shows timed events in the viewer timezone and leaves all-day dates alone',()=>{
 expect(eventWhen({date:'2026-11-11',time:'23:30',startsAt:'2026-11-12T04:30:00.000Z'},'America/Los_Angeles')).toEqual({date:'2026-11-11',time:'20:30'});
 expect(eventWhen({allDay:true,date:'2026-11-11'},'Asia/Tokyo')).toEqual({date:'2026-11-11',time:''});
});
it('rejects malformed event dates and preserves unfamiliar note properties',()=>{
 expect(()=>captureNote('event',{title:'Bad date',date:'2026-02-31',allDay:true})).toThrow();
 const result=patchProperties('---\ncustom: [one, two]\n# keep comment\ncompleted: false\n---\nbody',{completed:true});
 expect(result).toContain('# keep comment');expect(parseNote(result).properties.custom).toEqual(['one','two']);expect(result).toContain('body');
});
