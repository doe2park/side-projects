// Dependency-free production-JavaScript regressions; not browser/layout tests.
// TOKYO_TEMPLATE can point to an original template for before/after verification.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ROOT = path.join(__dirname, '..');
const template = fs.readFileSync(process.env.TOKYO_TEMPLATE || path.join(ROOT, 'src/template.html'), 'utf8');
const data = fs.readFileSync(path.join(ROOT, 'src/places.json'), 'utf8');
const HAR = '하라주쿠·오모테산도';
function definition(name, optional = false) {
  const start = template.indexOf(`function ${name}(`);
  if (start < 0 && optional) return '';
  assert.ok(start >= 0, `Production function ${name} exists`);
  const end = template.indexOf('\n}', start);
  assert.ok(end > start, `Production function ${name} has a closing line`);
  return template.slice(start, end + 2);
}
function app() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, {
      innerHTML: '', value: '', hidden: false, dataset: {}, listeners: {},
      setAttribute(name, value) { this[name] = value; },
      addEventListener(name, callback) { this.listeners[name] = callback; },
      classList: { add() {}, remove() {}, toggle() {} },
    });
    return elements.get(id);
  };
  const statusButtons = ['all', 'fav', 'todo', 'visited'].map(only => ({
    dataset: { only }, setAttribute(name, value) { this[name] = value; },
  }));
  const context = vm.createContext({
    document: { getElementById: element, querySelectorAll: () => statusButtons },
    localStorage: { getItem: () => null, setItem() {} },
    Intl, Date, console,
    navigator: { geolocation: { getCurrentPosition(ok) { ok({coords:{latitude:35.669,longitude:139.708}}); } } },
  });
  const run = code => vm.runInContext(code, context);
  const prefix = template.slice(template.indexOf('const PLACES ='), template.indexOf('/* ---------- 필터 ---------- */'))
    .replace('__DATA__', data).replace('__BASE__', '{}');
  const recStart = template.indexOf('const ICON_LOC =');
  const recConstants = template.slice(recStart, template.indexOf('const RADIUS =', recStart));
  const rankingConstants = template.slice(template.indexOf('const RADIUS ='), template.indexOf('// 도쿄 시간대'));
  const handlerStart = template.indexOf('$("recbase").addEventListener("click"');
  const handler = template.slice(handlerStart, template.indexOf('\n});', handlerStart) + 4);
  run(prefix + '\n' + recConstants + '\n' + rankingConstants + `
    let recSecs=[];
    const ICON_STAR_S='';
    const saveIc=()=>'', courseBtn=()=>'';
    const cluCache={s:null};
    let sheetState='mid';
    const isMobile=()=>true;
    const setSheet=(s)=>{sheetState=s;}, layoutTop=()=>{}, renderLegend=()=>{}, renderStats=()=>{},
      setBadge=()=>{}, apply=()=>{}, fit=()=>{}, drawBase=()=>{}, focusRec=()=>{}, renderSaved=()=>{};
    const viewCenter=()=>({lat:35.6690,lng:139.7080});
    const onScreen=()=>true;
    let ME=null;
    const drawMe=()=>{}, startWatch=()=>{}, toast=()=>{}, renderCourse=()=>{};
    function renderList(){ $('cnt').textContent=String(PLACES.filter(p=>p.show).length); }
    PLACES.forEach(p=>p.el={setAttribute(){}});
  ` + ['renderChips', 'recOrder', 'pickNear', 'renderRec', 'update'].map(n => definition(n)).join('\n')
    
    + '\n' + template.slice(template.indexOf('function setTab('), template.indexOf('// 폰에서 이미 열려'))
    + '\n' + definition('locate')
    + '\n' + (()=>{const start=template.indexOf('$("ward").addEventListener("change"'); return template.slice(start,template.indexOf('$("q").addEventListener',start));})()
    + '\n' + handler);
  run('S.tab="rec"; update();');
  const choose = key => element('recbase').listeners.click({ target: { closest: () => ({ dataset: { rb: key } }) } });
  const values = code => JSON.parse(run(`JSON.stringify(${code})`));
  return { run, values, element, choose };
}

test('old Ginza list filter does not empty the Harajuku neighbourhood list', () => {
  const a = app();
  a.run('S.ward="긴자·유라쿠초"; update();'); a.choose('h0');
  assert.equal(a.run('recSecs.reduce((n,[,rows])=>n+rows.length,0)'), 42);
  assert.equal(a.run('S.ward'), HAR);
  assert.equal(a.element('ward').value, HAR);
  assert.equal(a.run('PLACES.filter(p=>p.show).length'), 42);
  assert.match(a.element('cats').innerHTML, /전체 <span class="n">42<\/span>/);
});

test('tapping a neighbourhood lists every place in it, with no map-view option', () => {
  const a = app();
  assert.doesNotMatch(a.element('recbase').innerHTML, /data-rb="view"|지도 화면/);
  assert.equal(a.run('R.key'), '');
  assert.match(a.element('rec').innerHTML, /동네를 누르면/);
  for (let i = 0; i < 14; i++) {
    a.choose('h' + i);
    assert.equal(a.run('recSecs.flatMap(([,r])=>r).length'), a.run('PLACES.filter(p=>p.h===R.base.label).length'));
    assert.equal(a.run('recSecs.flatMap(([,r])=>r).every(o=>o.p.h===R.base.label)'), true);
  }
  a.choose('h0');
  assert.match(a.element('rec').innerHTML, /하라주쿠·오모테산도 42곳/);
  assert.doesNotMatch(a.element('rec').innerHTML, /id="recall"/, 'No filter notice when nothing is hidden');
});

test('category/search/status filters narrow the neighbourhood list and can be cleared in place', () => {
  const a = app(); a.choose('h0');
  a.run('S.cat="쇼핑"; update();');
  assert.equal(a.run('recSecs.every(([c])=>c==="쇼핑")'), true);
  a.run('S.q="__no_such_place__"; update();');
  assert.equal(a.run('recSecs.flatMap(([,r])=>r).length'), 0);
  a.run('S.q=""; S.only="fav"; update();');
  assert.equal(a.run('recSecs.flatMap(([,r])=>r).length'), 0);
  a.run('const favorite=PLACES.find(p=>p.h===R.base.label&&p.c==="쇼핑"); marks[favorite.cid]={f:true}; update();');
  assert.equal(a.run('recSecs.flatMap(([,r])=>r).length'), 1);
  assert.match(a.element('rec').innerHTML, /전체 42곳 중 1곳만/);
  assert.equal(typeof a.element('recall').onclick, 'function'); a.element('recall').onclick();
  assert.deepEqual(a.values('[S.tab,S.ward,S.cat,S.subs.size,S.q,S.only]'), ['rec', HAR, '전체', 0, '', 'all']);
  assert.equal(a.run('recSecs.flatMap(([,r])=>r).length'), 42);
});

test('clearing the region and current-location scope clear a stale named region without clearing other filters', () => {
  const a = app(); a.choose('h0');
  a.run('S.q="test"; S.only="fav";'); a.element('ward').listeners.change({target:{value:'전체'}});
  assert.deepEqual(a.values('[R.key,R.base,S.ward]'), ['', null, '전체']); assert.equal(a.element('ward').value, '전체');
  assert.deepEqual(a.values('[S.q,S.only]'), ['test', 'fav']);
  a.run('R.key="me"; R.base={lat:35.669,lng:139.708,label:"내 위치"}; S.ward="긴자·유라쿠초"; syncRecWard();');
  assert.equal(a.run('S.ward'), '전체');
});

test('switching regions preserves places, saved marks, and itinerary', () => {
  const a = app();
  const snapshot = a.run('JSON.stringify(PLACES.map(({show,el,...p})=>p))');
  a.run('marks[PLACES[0].cid]={f:true,v:true}; C.days[0].ids=[PLACES[0].cid];');
  const personal = a.run('JSON.stringify([marks,C])');
  a.choose('h2'); a.choose('h0');
  assert.equal(a.run('JSON.stringify(PLACES.map(({show,el,...p})=>p))'), snapshot);
  assert.equal(a.run('JSON.stringify([marks,C])'), personal);
});

test('returning from a different list region restores recommendation scope and results', () => {
  const a = app(); a.choose('h0');
  a.run('setTab("list"); S.ward="긴자·유라쿠초"; update(); setTab("rec");');
  assert.equal(a.run('S.ward'), HAR);
  assert.equal(a.run('recSecs.flatMap(([,r])=>r).length'), 42);
});

test('region dropdown in recommendation tab updates named scope or opens other-region list', () => {
  const a = app();
  a.element('ward').listeners.change({target:{value:HAR}});
  assert.deepEqual(a.values('[R.key,S.ward,S.tab]'), ['h0', HAR, 'rec']);
  assert.equal(a.run('recSecs.flatMap(([,r])=>r).length'), 42);
  a.element('ward').listeners.change({target:{value:'전체'}});
  assert.deepEqual(a.values('[R.key,S.ward,S.tab]'), ['', '전체', 'rec']);
  a.element('ward').listeners.change({target:{value:'그 밖의 지역'}});
  assert.deepEqual(a.values('[S.ward,S.tab]'), ['그 밖의 지역', 'list']);
  assert.equal(a.run('PLACES.filter(p=>p.show).every(p=>p.h==="그 밖의 지역")'), true);
});

test('successful location callback clears named region from both list and recommendation tabs', () => {
  for (const tab of ['list', 'rec']) {
    const a = app(); a.choose('h2'); a.run(`setTab(${JSON.stringify(tab)}); locate(true);`);
    assert.deepEqual(a.values('[S.ward,R.key,S.tab]'), ['전체', 'me', 'rec']);
    assert.equal(a.element('ward').value, '전체');
    assert.ok(a.run('recSecs.flatMap(([,r])=>r).length') > 0);
    assert.equal(a.run('recSecs.flatMap(([,r])=>r).every(o=>o.d<=RADIUS)'), true);
    assert.deepEqual(a.values('REC_N'), { '식당': 3, '카페·디저트': 3, '술집': 2, '쇼핑': 4 });
    assert.equal(a.run('recSecs.every(([c,rows])=>rows.length<=REC_N[c])'), true, 'My-location picks stay capped');
  }
});

test('choosing a recommendation neighborhood expands an initially collapsed mobile sheet', () => {
  const a = app(); a.run('sheetState="min";'); a.choose('h0');
  assert.equal(a.run('sheetState'), 'mid', 'Neighborhood choice must expose its list');
  assert.equal(a.run('recSecs.flatMap(([,r])=>r).length'), 42);
});

test('"전체" and tapping the active neighbourhood again both return to all areas', () => {
  const a = app();
  assert.match(a.element('recbase').innerHTML, /data-rb="all" aria-pressed="true"/);
  assert.match(a.element('rec').innerHTML, /도쿄 전체 238곳/);
  assert.match(a.element('rec').innerHTML, /data-hood="h0"[^>]*><b>하라주쿠·오모테산도<\/b><span>42곳/);
  for (const back of ['all', 'h0']) {
    a.choose('h0'); assert.equal(a.run('PLACES.filter(p=>p.show).length'), 42);
    a.choose(back);
    assert.deepEqual(a.values('[R.key,R.base,S.ward]'), ['', null, '전체']);
    assert.equal(a.run('PLACES.filter(p=>p.show).length'), 238);
    assert.match(a.element('rec').innerHTML, /도쿄 전체 238곳/);
  }
});

test('neighbourhood list is an accordion: one category open at first, open state survives re-render', () => {
  const a = app(); a.choose('h2');
  const html = () => a.element('rec').innerHTML;
  assert.equal((html().match(/<details class="racc"/g) || []).length, 4, 'Ginza has four non-empty categories');
  assert.equal((html().match(/<details class="racc"[^>]* open>/g) || []).length, 1);
  a.run('recOpen.add("쇼핑"); update();');
  assert.match(html(), /data-acc="쇼핑"[^>]* open>/);
  a.choose('h0');
  assert.equal((html().match(/<details class="racc"[^>]* open>/g) || []).length, 1, 'A new neighbourhood resets what is open');
  a.run('S.cat="식당"; update();');
  assert.match(html(), /data-acc="식당"[^>]* open>/, 'A single remaining category is opened');
});
