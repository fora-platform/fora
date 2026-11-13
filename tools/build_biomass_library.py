"""Build src/biomassLibrary.js and src/dbhLibrary.js from the FORA model library workbook.

Usage (from the repository root):
    python tools/build_biomass_library.py path/to/FORA_model_kutuphanesi.xlsx

The workbook must hold computed values (open and save it once in Excel or
LibreOffice). Every formula in the workbook's biomass sheets is translated to
JavaScript, evaluated with Node at d = 25 cm, h = 18 m, CD = 4 m and compared
with the workbook's own value; the script stops if any differs. The DBH models
(sheets DBH_modelleri and Jucker_bolgesel, Palearctic rows) are checked the
same way at h = 18 m with the crown measure each model uses.
Requires: Python 3 with openpyxl, Node.js.
"""
import sys, re, json, math, subprocess
from openpyxl import load_workbook

WB = sys.argv[1] if len(sys.argv) > 1 else 'FORA_model_kutuphanesi.xlsx'
OUT = 'src/biomassLibrary.js'
# --- Excel formula -> JavaScript expression in d (DBH, cm), h (height, m), cd (crown diameter, m)
OKU = {'C16': 'd', 'C13': 'h', 'C14': 'cd'}
TOK = re.compile(r"\s*(?:(?P<num>\d+\.?\d*(?:[eE][-+]?\d+)?)|(?P<ref>(?:'[^']+'|[A-Za-z_][A-Za-z0-9_]*)!\$?[A-Z]{1,2}\$?\d+|\$?[A-Z]{1,2}\$?\d+(?::\$?[A-Z]{1,2}\$?\d+)?)|(?P<fn>[A-Z][A-Z0-9]*)\(|(?P<op><=|>=|<>|[-+*/^(),<>=&]))")

def tokenize(s):
    pos, out = 0, []
    while pos < len(s):
        m = TOK.match(s, pos)
        if not m or m.end() == pos:
            if s[pos:].strip() == '': break
            raise ValueError(f'çözülemedi: {s[pos:pos+30]!r} in {s!r}')
        kind = m.lastgroup; out.append((kind, m.group(kind))); pos = m.end()
    return out

class Conv:
    def __init__(self, wb_f, wb_v):
        self.f, self.v = wb_f, wb_v
    def cell(self, sheet, ref):
        ref = ref.replace('$', '')
        if sheet == 'Okuyun':
            if ref in OKU: return OKU[ref]
            raise ValueError('Okuyun hücresi: ' + ref)
        c = self.f[sheet][ref].value
        if isinstance(c, str) and c.startswith('='):
            return '(' + self.expr(sheet, c[1:]) + ')'
        if isinstance(c, (int, float)): return repr(float(c))
        raise ValueError(f'{sheet}!{ref} sayı değil: {c!r}')
    def expr(self, sheet, s):
        self.t = tokenize(s); self.i = 0; self.sheet = sheet
        out = self.cmp()
        if self.i != len(self.t): raise ValueError('artık token: ' + str(self.t[self.i:]))
        return out
    def peek(self): return self.t[self.i] if self.i < len(self.t) else (None, None)
    def take(self): tok = self.t[self.i]; self.i += 1; return tok
    def cmp(self):
        a = self.add()
        while self.peek()[1] in ('<', '>', '<=', '>=', '=', '<>'):
            op = self.take()[1]; b = self.add()
            a = f'({a}{ {"=": "===", "<>": "!=="}.get(op, op)}{b})'
        return a
    def add(self):
        a = self.mul()
        while self.peek()[1] in ('+', '-'):
            op = self.take()[1]; b = self.mul(); a = f'{a}{op}{b}'
        return a
    def mul(self):
        a = self.power()
        while self.peek()[1] in ('*', '/'):
            op = self.take()[1]; b = self.power(); a = f'{a}{op}{b}'
        return a
    def signed(self):
        # Excel: unary minus binds tighter than ^  (-2^2 = 4)
        if self.peek()[1] == '-':
            self.take(); return f'(-{self.signed()})'
        if self.peek()[1] == '+':
            self.take(); return self.signed()
        return self.atom()
    def power(self):
        base = self.signed()
        while self.peek()[1] == '^':
            self.take(); ex = self.signed()
            base = f'({base})**({ex})'
        return base
    def args(self):
        out = [self.cmp()]
        while self.peek()[1] == ',':
            self.take(); out.append(self.cmp())
        assert self.take()[1] == ')'
        return out
    def atom(self):
        kind, val = self.take()
        if kind == 'num': return repr(float(val))
        if kind == 'ref':
            if ':' in val and '!' not in val:
                a, b = val.replace('$', '').split(':')
                col, r0, r1 = re.match(r'([A-Z]+)(\d+)', a).group(1), int(re.match(r'[A-Z]+(\d+)', a).group(1)), int(re.match(r'[A-Z]+(\d+)', b).group(1))
                return '(' + '+'.join(self._sub(self.sheet, f'{col}{r}') for r in range(r0, r1 + 1)) + ')'
            if '!' in val:
                sh, rf = val.split('!'); sh = sh.strip("'")
                return self._sub(sh, rf)
            return self._sub(self.sheet, val)
        if kind == 'fn':
            name = val
            if name == 'PI':
                assert self.take()[1] == ')'; return 'Math.PI'
            a = self.args()
            if name == 'EXP': return f'Math.exp({a[0]})'
            if name == 'LN': return f'Math.log({a[0]})'
            if name == 'SQRT': return f'Math.sqrt({a[0]})'
            if name == 'IF': return f'(({a[0]})?({a[1]}):({a[2] if len(a) > 2 else "0"}))'
            if name == 'AND': return '(' + '&&'.join(f'({x})' for x in a) + ')'
            if name == 'SUM': return '(' + '+'.join(a) + ')'
            raise ValueError('fonksiyon: ' + name)
        if val == '(':
            e = self.cmp(); assert self.take()[1] == ')'; return f'({e})'
        raise ValueError(f'beklenmeyen token {kind} {val}')
    def _sub(self, sheet, ref):
        saved = (self.t, self.i, self.sheet)
        out = self.cell(sheet, ref)
        self.t, self.i, self.sheet = saved
        return out

# --- collect models
wf, wv = load_workbook(WB), load_workbook(WB, data_only=True)
C = Conv(wf, wv)
SCOPE = {'Türkiye': 'tr', 'Avrupa–Akdeniz': 'eu', 'Dünya': 'world'}
FORA_CF = {'SON-T', 'DUR15-PNI-DH', 'TOL12-PSY-D', 'TOL12-PSY-D2H', 'ZIA03-FAG'}   # log-scale, no published correction
D_MIN = {'DUR-ABI': 20.0}

def rng(s):
    if s is None: return None
    s = str(s)
    if 'yok' in s and not re.search(r'\d', s): return None
    m = re.search(r'(\d+(?:\.\d+)?)\s*[–-]\s*(\d+(?:\.\d+)?)', s)
    if m: return [float(m.group(1)), float(m.group(2))]
    m = re.findall(r'(\d+(?:\.\d+)?)', s)
    if '/' in s and len(m) >= 3: return [float(m[0]), float(m[-1])]
    return None

def num(x):
    try: return float(x)
    except Exception: return None

models = []
def add(**kw):
    js = kw.pop('js')
    cf = kw.get('cf')
    if cf: js = f'({js})*{cf!r}'
    kw['js'] = js
    models.append(kw)

# --- 1. AGB_modelleri
a, av = wf['AGB_modelleri'], wv['AGB_modelleri']
for r in range(2, a.max_row + 1):
    code = a.cell(row=r, column=1).value
    if not code: continue
    status = a.cell(row=r, column=20).value
    if status == 'KULLANMA': continue
    cf = None; cfnote = None
    if code in FORA_CF:
        cf = round(math.exp(av.cell(row=r, column=10).value ** 2 / 2), 6); cfnote = 'FORA: exp(σ²/2); makalede düzeltme yok'
    elif isinstance(a.cell(row=r, column=11).value, (int, float)):
        cfnote = 'makaledeki CF formülde'
    dr = rng(a.cell(row=r, column=15).value)
    if code in D_MIN and dr: dr = [D_MIN[code], dr[1]]
    add(code=code, kind='agb', species=a.cell(row=r, column=3).value, source=a.cell(row=r, column=2).value, region=a.cell(row=r, column=4).value,
        scope=SCOPE[a.cell(row=r, column=24).value], status=status, eq=a.cell(row=r, column=5).value, d=dr, h=rng(a.cell(row=r, column=16).value),
        n=num(a.cell(row=r, column=17).value), doi=a.cell(row=r, column=22).value, note=a.cell(row=r, column=23).value,
        cf=cf, cfNote=cfnote, js=C.cell('AGB_modelleri', f'U{r}'), excel=av.cell(row=r, column=21).value)

# --- 2. Forrester (AGB and roots)
fo, fov = wf['Forrester_Avrupa'], wv['Forrester_Avrupa']
FSRC = 'Forrester vd. 2017, Forest Ecology and Management 396:160–175 (Ek A, Tablo A.5)'
for r in range(3, fo.max_row + 1):
    code = str(fo.cell(row=r, column=1).value)
    if not (code.endswith('-AGB') or code.endswith('-KOK')): continue
    add(code=code, kind='agb' if code.endswith('-AGB') else 'root', species=f"{fo.cell(row=r, column=2).value} ({fo.cell(row=r, column=3).value})", source=FSRC,
        region='Avrupa geneli (yayımlanmış veri setleri)', scope='eu', status='Doğrulandı', eq='ln Y = ln β0 + β1·ln d; Y = exp(…)·CF', d=rng(fo.cell(row=r, column=9).value), h=None,
        n=num(fo.cell(row=r, column=8).value), doi='10.1016/j.foreco.2017.04.011', note='Sözde gözlemlerle uydurulmuş Avrupa geneli denklem (Denk. 3).', cf=None, cfNote='makaledeki CF formülde',
        js=C.cell('Forrester_Avrupa', f'M{r}'), excel=fov.cell(row=r, column=13).value)

# --- 3. Ruiz-Peinado 2011/2012 totals and roots, Correia 2018 roots
ak, akv = wf['Akdeniz_RuizPeinado'], wv['Akdeniz_RuizPeinado']
RP11 = ('Ruiz-Peinado, del Río & Montero 2011, Forest Systems 20(1):176–188', '10.5424/fs/2011201-11643')
RP12 = ('Ruiz-Peinado, Montero & del Río 2012, Forest Systems 21(1):42–52', '10.5424/fs/2112211-02193')
COR = ('Correia, Faias, Ruiz-Peinado vd. 2018, Forest Ecology and Management 429:425–436', '10.1016/j.foreco.2018.07.037')
hdr = None
for r in range(3, ak.max_row + 1):
    code = ak.cell(row=r, column=1).value; comp = str(ak.cell(row=r, column=3).value)
    if code and isinstance(code, str) and len(code) <= 7 and '-' not in code and ak.cell(row=r, column=9).value:
        hdr = dict(n=re.search(r'n = (\d+)', comp), d=rng(ak.cell(row=r, column=9).value), h=rng(ak.cell(row=r, column=10).value)); continue
    if not code or not isinstance(code, str): continue
    if code.startswith('RP'):
        src, doi = RP12 if code.startswith('RP12') else RP11
        sp = ak.cell(row=r, column=2).value
        if comp.startswith('TOPRAK ÜSTÜ'):
            add(code=code, kind='agb', species=sp, source=src, region='İspanya (ulusal örnekleme)', scope='eu', status='Doğrulandı', eq='Bileşen toplamı (gövde, dallar, ibre/yaprak)',
                d=hdr['d'], h=hdr['h'], n=float(hdr['n'].group(1)) if hdr['n'] else None, doi=doi, note='Bileşen modellerinin toplamı; kalın dal için Z eşiği.', cf=None, cfNote='orijinal ölçekte uyum',
                js=C.cell('Akdeniz_RuizPeinado', f'F{r}'), excel=akv.cell(row=r, column=6).value)
        elif comp.startswith('Wr'):
            add(code=code + '-KOK', kind='root', species=sp, source=src, region='İspanya', scope='eu', status='Doğrulandı', eq=str(ak.cell(row=r, column=4).value),
                d=hdr['d'], h=hdr['h'], n=None, doi=doi, note='Kök (kaba kök sistemi).', cf=None, cfNote=None,
                js=C.cell('Akdeniz_RuizPeinado', f'F{r}'), excel=akv.cell(row=r, column=6).value)
    if code.startswith('COR18') and comp.startswith('Kök (kütük'):
        add(code=code + '-KOK', kind='root', species='Fıstıkçamı (Pinus pinea)', source=COR[0], region='Akdeniz geneli: İtalya, İspanya, Portekiz', scope='eu', status='Doğrulandı',
            eq=str(ak.cell(row=r, column=4).value), d=[6.3, 72.6], h=[2.1, 21.2], n=74.0, doi=COR[1], note='Kök, kütük dahil (74 ağaç).', cf=None, cfNote=None,
            js=C.cell('Akdeniz_RuizPeinado', f'F{r}'), excel=akv.cell(row=r, column=6).value)

# --- 4. New root models (Kok_modelleri rows written there)
k, kv = wf['Kok_modelleri'], wv['Kok_modelleri']
for r in range(3, k.max_row + 1):
    code = k.cell(row=r, column=1).value
    if code in ('AYD16-CED-WKT', 'ROH19-PSY', 'ROH19-QUE', 'ROH19-BPE') or str(code).startswith('MON05-'):
        doi = {'AYD': 'YÖK Tez Merkezi 475153', 'ROH': '10.3832/ifor2862-012',
               'MON': 'https://distritoforestal.es/images/MonografaForestal13.FijacinCO2.pdf'}[code[:3]]
        add(code=code, kind='root', species=k.cell(row=r, column=2).value, source=k.cell(row=r, column=3).value,
            region='İspanya' if code.startswith('MON') else k.cell(row=r, column=3).value,
            scope='tr' if code.startswith('AYD') else 'eu', status=k.cell(row=r, column=9).value, eq=k.cell(row=r, column=5).value, d=rng(k.cell(row=r, column=7).value), h=None,
            n=num(k.cell(row=r, column=6).value), doi=doi, note=k.cell(row=r, column=10).value, cf=None, cfNote=None,
            js=C.cell('Kok_modelleri', f'H{r}'), excel=kv.cell(row=r, column=8).value)

codes = [m['code'] for m in models]
assert len(codes) == len(set(codes)), [c for c in codes if codes.count(c) > 1]

# --- evaluate every expression in Node and compare with the Excel cache
def inputs(js): return [v for v in ('d', 'h', 'cd') if re.search(rf'(?<![A-Za-z_.]){v}(?![A-Za-z_])', js)]
for m in models: m['inputs'] = inputs(m['js'])
src = 'const M=' + json.dumps([{'code': m['code'], 'js': m['js']} for m in models]) + ';\nconst out={};for(const m of M){const f=new Function("d","h","cd","return "+m.js);out[m.code]=f(25,18,4);}console.log(JSON.stringify(out));'
res = json.loads(subprocess.run(['node', '-e', src], capture_output=True, text=True, check=True).stdout)
missing = [m['code'] for m in models if not isinstance(m['excel'], (int, float))]
if missing:
    sys.exit(f'{len(missing)} models have no computed value in the workbook (e.g. {missing[0]}). '
             'Open the workbook in Excel or LibreOffice, save it, and run this script again.')
bad = 0
for m in models:
    want = m['excel'] * (m['cf'] or 1.0)
    got = res[m['code']]
    m['test'] = got
    if not (abs(got - want) <= 1e-9 * max(1, abs(want))):
        bad += 1; print('FARK', m['code'], got, want)
if bad: sys.exit('formula check failed')
print(len(models), 'model;', sum(m['kind'] == 'agb' for m in models), 'toprak üstü,', sum(m['kind'] == 'root' for m in models), 'kök; fark', bad)

# --- write the JavaScript module
def s(x): return json.dumps(x, ensure_ascii=False)
def short(t, n=400):
    if t is None: return None
    t = re.sub(r'\s+', ' ', str(t)).strip()
    return t if len(t) <= n else t[:n - 1] + '…'
lines = []
for m in models:
    fields = [f'code:{s(m["code"])}', f'kind:{s(m["kind"])}', f'scope:{s(m["scope"])}', f'status:{s(m["status"])}', f'species:{s(m["species"])}',
              f'source:{s(short(m["source"], 300))}', f'region:{s(short(m["region"], 200))}', f'eq:{s(short(m["eq"], 200))}', f'inputs:{s(m["inputs"])}',
              f'd:{s(m["d"])}', f'h:{s(m["h"])}', f'n:{s(int(m["n"]) if m["n"] else None)}', f'doi:{s(m["doi"])}', f'cf:{s(m["cf"])}', f'cfNote:{s(m["cfNote"])}',
              f'note:{s(short(m["note"]))}', f'test:{repr(m["test"])}', f'fn:(d,h,cd)=>{m["js"]}']
    lines.append('  {' + ','.join(fields) + '}')
head = '''// biomassLibrary.js — FORA's allometric biomass model library.
//
// GENERATED from FORA_model_kutuphanesi.xlsx (library version 12, 13 Nov 2026);
// do not edit by hand. Every coefficient in that workbook was checked against
// the original paper (status "Doğrulandı"), read twice from the open-access
// web version ("Web okuması"), taken from a paper that quotes the original
// ("İkincil kaynak") or from a public equation database ("Site kaydı").
// Models the workbook marks KULLANMA (unusable) are left out.
//
// Each model: fn(d, h, cd) returns dry biomass in kg from DBH d (cm), height
// h (m) and crown diameter cd (m); `inputs` lists the variables it uses.
// kind: "agb" above-ground, "root" below-ground. scope: "tr" Türkiye,
// "eu" Europe–Mediterranean, "world" elsewhere. d / h: data range [min, max]
// (null when the paper does not report it). cf: correction factor already
// inside fn when FORA adds one (log-scale models whose paper gives none).
// test: value of fn(25, 18, 4) computed in the workbook; the test suite
// checks every fn against it.
'''
src = head + '\nexport const MODELS = [\n' + ',\n'.join(lines) + '\n];\n\nexport const MODEL_BY_CODE = Object.fromEntries(MODELS.map((m) => [m.code, m]));\n'
open(OUT, 'w', encoding='utf-8').write(src)
print(len(src), 'bytes')


# =====================================================================================
# DBH models: height (and crown) -> DBH. Sheets DBH_modelleri and Jucker_bolgesel.
# Each model gets the crown measure it was fitted with (column "Taç ölçüsü"):
#   mean  mean crown diameter (Jucker; Balenović: mean of two perpendicular widths) -> FORA bounding-box CD
#   max   maximum crown diameter (Kalliovirta & Tokola) -> hull maximum diameter, or the longer bounding-box side
#   eq    diameter of the circle with the crown's area (Valbuena) -> 2·sqrt(CPA/π)
#   area  crown area (Gonzalez-Benecke) -> bounding-box ellipse area
# In the workbook the test tree has CD 4 m; max = CD × ratio (Okuyun C15), area = Okuyun C17.
OUT_DBH = 'src/dbhLibrary.js'
ov = wv['Okuyun']
H0, CD0, R0, CA0 = (ov[c].value for c in ('C13', 'C14', 'C15', 'C17'))
CROWN = {'JUC-D6': 'mean', 'BAL-D3': 'mean', 'VAL': 'eq', 'GB-dbh2': 'area', 'GEN19-QCE-CD': 'mean'}
EU_KEYS = ('Finlandiya', 'Hırvatistan', 'İspanya', 'Avrupa')
dbh = []
dm, dmv = wf['DBH_modelleri'], wv['DBH_modelleri']
for r in range(2, dm.max_row + 1):
    code = dm.cell(row=r, column=1).value
    if not code: continue
    crown = 'max' if code.startswith('KT-9.3') else CROWN.get(code)
    f = dm.cell(row=r, column=21).value[1:].replace('Okuyun!$C$14*Okuyun!$C$15', 'Okuyun!$C$14').replace('Okuyun!$C$17', 'Okuyun!$C$14')
    reg = dm.cell(row=r, column=4).value or ''
    dbh.append(dict(code=code, scope='tr' if reg.startswith('Türkiye') else ('eu' if any(k in reg for k in EU_KEYS) else 'world'),
                    status=dm.cell(row=r, column=20).value, species=dm.cell(row=r, column=3).value, source=dm.cell(row=r, column=2).value, region=reg,
                    eq=dm.cell(row=r, column=5).value, crown=crown, crownNote=dm.cell(row=r, column=11).value if crown else None,
                    d=rng(dm.cell(row=r, column=14).value), h=rng(dm.cell(row=r, column=15).value), c=rng(dm.cell(row=r, column=16).value),
                    n=num(dm.cell(row=r, column=17).value), doi=dm.cell(row=r, column=22).value, note=dm.cell(row=r, column=23).value,
                    js=C.expr('DBH_modelleri', f), excel=dmv.cell(row=r, column=21).value,
                    cdTest={'max': CD0 * R0, 'area': CA0}.get(crown, CD0)))
jb, jbv = wf['Jucker_bolgesel'], wv['Jucker_bolgesel']
for r in range(3, jb.max_row + 1):
    code = jb.cell(row=r, column=1).value
    if not code or not str(jb.cell(row=r, column=3).value).startswith('Palearktik'): continue
    grp, ft = jb.cell(row=r, column=5).value, jb.cell(row=r, column=4).value
    dbh.append(dict(code=code, scope='world', status='Doğrulandı — dikkat', species=f'{grp}; {ft}',
                    source=f'Jucker vd. 2017, Global Change Biology 23:177–190 (Ek, Tablo {jb.cell(row=r, column=2).value})',
                    region=f'Palearktik bölge (Avrupa, Kuzey Afrika, Asya; Türkiye dahil) — {ft}', eq='D = α·(H × CD)^β', crown='mean',
                    crownNote='Ortalama taç çapı (Ek S1)', d=None, h=None, c=None, n=None, doi='10.1111/gcb.13388',
                    note=f'α çarpan olarak okunuyor (makalenin Şekil 3 açıklaması); grup modellerinin σ değeri verilmemiş, düzeltme yok. CV %{jb.cell(row=r, column=8).value}.',
                    js=C.expr('Jucker_bolgesel', jb.cell(row=r, column=10).value[1:]), excel=jbv.cell(row=r, column=10).value, cdTest=CD0))
codes = [m['code'] for m in dbh]
assert len(codes) == len(set(codes)), codes
for m in dbh: m['inputs'] = [v for v in ('h', 'cd') if re.search(rf'(?<![A-Za-z_.]){v}(?![A-Za-z_])', m['js'])]
src = 'const M=' + json.dumps([{'code': m['code'], 'js': m['js'], 'cd': m['cdTest']} for m in dbh]) + f';\nconst out={{}};for(const m of M){{const f=new Function("h","cd","return "+m.js);out[m.code]=f({H0},m.cd);}}console.log(JSON.stringify(out));'
res = json.loads(subprocess.run(['node', '-e', src], capture_output=True, text=True, check=True).stdout)
bad = 0
for m in dbh:
    if not isinstance(m['excel'], (int, float)): sys.exit(f'{m["code"]}: no computed value in the workbook')
    m['test'] = res[m['code']]
    if not (abs(m['test'] - m['excel']) <= 1e-9 * max(1, abs(m['excel']))):
        bad += 1; print('FARK', m['code'], m['test'], m['excel'])
if bad: sys.exit('DBH formula check failed')
print(len(dbh), 'DBH modeli; fark', bad)
lines = []
for m in dbh:
    fields = [f'code:{s(m["code"])}', f'scope:{s(m["scope"])}', f'status:{s(m["status"])}', f'species:{s(m["species"])}', f'source:{s(short(m["source"], 300))}',
              f'region:{s(short(m["region"], 200))}', f'eq:{s(short(m["eq"], 200))}', f'inputs:{s(m["inputs"])}', f'crown:{s(m["crown"])}', f'crownNote:{s(short(m["crownNote"], 200))}',
              f'd:{s(m["d"])}', f'h:{s(m["h"])}', f'c:{s(m["c"])}', f'n:{s(int(m["n"]) if m["n"] else None)}', f'doi:{s(m["doi"])}', f'note:{s(short(m["note"]))}',
              f'testCd:{repr(m["cdTest"])}', f'test:{repr(m["test"])}', f'fn:(h,cd)=>{m["js"]}']
    lines.append('  {' + ','.join(fields) + '}')
head = '''// dbhLibrary.js — DBH models from outside Türkiye in FORA's model library.
//
// GENERATED from FORA_model_kutuphanesi.xlsx (library version 12, 13 Nov 2026),
// sheets DBH_modelleri and Jucker_bolgesel (Palearctic rows); do not edit by hand.
// FORA's own Turkish DBH models are in species.js; dbhChoice.js combines both.
//
// Each model: fn(h, cd) returns DBH in cm from height h (m) and the crown
// measure cd named in `crown` (null when the model uses height only):
//   "mean" mean crown diameter (m)          "max"  maximum crown diameter (m)
//   "eq"   diameter of a circle with the crown's area (m)   "area" crown area (m²)
// d / h / c: data range of DBH (cm), height (m) and crown (m) [min, max], or null.
// test: value computed in the workbook at h = 18 m and crown testCd; the test
// suite checks every fn against it.
'''
src = head + '\nexport const DBH_MODELS = [\n' + ',\n'.join(lines) + '\n];\n\nexport const DBH_BY_CODE = Object.fromEntries(DBH_MODELS.map((m) => [m.code, m]));\n'
open(OUT_DBH, 'w', encoding='utf-8').write(src)
print(len(src), 'bytes')

# =====================================================================================
# Readable formula with the coefficients, from the generated JavaScript expression:
# the exact formula FORA computes, shown in the Sp tab ("Ayrıntı").
JTOK = re.compile(r"\s*(?:(?P<num>\d+\.?\d*(?:[eE][-+]?\d+)?)|(?P<fn>Math\.(?:exp|log|sqrt))\(|(?P<id>Math\.PI|[A-Za-z_]+)|(?P<op>\*\*|[-+*/()?:<>]))")

def jparse(src):
    toks, pos = [], 0
    while pos < len(src):
        m = JTOK.match(src, pos)
        if not m or m.end() == pos:
            if src[pos:].strip() == '': break
            raise ValueError('formula: ' + src[pos:pos + 20])
        toks.append((m.lastgroup, m.group(m.lastgroup))); pos = m.end()
    i = 0
    def peek(): return toks[i] if i < len(toks) else (None, None)
    def take():
        nonlocal i; t = toks[i]; i += 1; return t
    def ternary():
        c = cmp_()
        if peek()[1] == '?':
            take(); a = ternary(); assert take()[1] == ':'; b = ternary(); return ('?', c, a, b)
        return c
    def cmp_():
        a = add()
        while peek()[1] in ('<', '>'):
            op = take()[1]; a = (op, a, add())
        return a
    def add():
        a = mul()
        while peek()[1] in ('+', '-'):
            op = take()[1]; a = (op, a, mul())
        return a
    def mul():
        a = unary()
        while peek()[1] in ('*', '/'):
            op = take()[1]; a = (op, a, unary())
        return a
    def unary():
        if peek()[1] == '-': take(); return ('neg', unary())
        return power()
    def power():
        b = atom()
        if peek()[1] == '**': take(); return ('^', b, unary())
        return b
    def atom():
        k, v = take()
        if k == 'num': return ('num', float(v))
        if k == 'id': return ('id', v)
        if k == 'fn':
            a = ternary(); assert take()[1] == ')'; return ('call', v[5:], a)
        if v == '(':
            e = ternary(); assert take()[1] == ')'; return e
        raise ValueError('formula token ' + v)
    e = ternary()
    assert i == len(toks), toks[i:]
    return e

SUP = {2.0: '²', 3.0: '³'}
def jfmt(e, names):
    def num(x):
        if x == int(x) and abs(x) < 1e6: return str(int(x))
        return repr(float(f'{x:.7g}'))
    PREC = {'?': 7, '<': 2, '>': 2, '+': 3, '-': 3, '*': 4, '/': 4, 'neg': 5, '^': 6}   # [a ? b : c] is printed in brackets
    def p(e):
        k = e[0]
        return PREC.get(k, 7)
    def wrap(e, need, strict=False):
        s = f(e)
        return f'({s})' if (p(e) < need or (strict and p(e) == need)) else s
    def f(e):
        k = e[0]
        if k == 'num': return num(e[1])
        if k == 'id': return 'π' if e[1] == 'Math.PI' else names.get(e[1], e[1])
        if k == 'call':
            name = {'exp': 'exp', 'log': 'ln', 'sqrt': '√'}[e[1]]
            inner = f(e[2])
            return f'√{inner}' if name == '√' and p(e[2]) == 7 else f'{name}({inner})'
        if k == 'neg': return '−' + wrap(e[1], 5)
        if k == '^':
            base = wrap(e[1], 7)
            if e[2][0] == 'num' and e[2][1] in SUP: return base + SUP[e[2][1]]
            ex = f(e[2]) if p(e[2]) >= 5 else f'({f(e[2])})'
            return f'{base}^{ex}'
        if k in ('*', '/'):
            return f'{wrap(e[1], 4)}{"·" if k == "*" else "/"}{wrap(e[2], 4, strict=True)}'
        if k in ('+', '-'):
            r = e[2]
            if k == '+' and r[0] == 'neg': return f'{wrap(e[1], 3)} − {wrap(r[1], 4)}'
            if k == '+' and r[0] == 'num' and r[1] < 0: return f'{wrap(e[1], 3)} − {num(-r[1])}'
            return f'{wrap(e[1], 3)} {"+" if k == "+" else "−"} {wrap(r, 3, strict=(k == "-"))}'
        if k in ('<', '>'): return f'{wrap(e[1], 3)} {k} {wrap(e[2], 3)}'
        if k == '?': return f'[{f(e[1])} ? {f(e[2])} : {f(e[3])}]'
        raise ValueError(k)
    return f(e)

CROWN_NAME = {'mean': 'CD', 'max': 'CDmax', 'eq': 'CDe', 'area': 'CA', None: 'CD'}
def formula(js, crown=None):
    return jfmt(jparse(js), {'d': 'd', 'h': 'h', 'cd': CROWN_NAME.get(crown, 'CD')}).replace(' + −', ' − ')

for path, items, crown_of in ((OUT, models, lambda m: None), (OUT_DBH, dbh, lambda m: m['crown'])):
    txt = open(path, encoding='utf-8').read()
    for m in items:
        fm = formula(m['js'], crown_of(m))
        key = f'code:{s(m["code"])},'
        assert txt.count(key) == 1, m['code']
        txt = txt.replace(key, key + f'formula:{s(fm)},')
    open(path, 'w', encoding='utf-8').write(txt)
print('formüller yazıldı')
