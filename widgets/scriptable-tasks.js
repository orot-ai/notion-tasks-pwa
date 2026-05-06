/**
 * iOS Scriptable 위젯 — 노션 TASK
 *
 * 위젯 슬롯:
 *  - 잠금화면 inline      → 임박한 다음 일정 (시계 아래 한 줄)
 *  - 잠금화면 rectangular → "일정" or "할일" 리스트 (시계 옆 박스)
 *  - 잠금화면 circular    → 카운트만 (배터리 옆 동그라미)
 *  - 홈화면   small / medium / large → 그라데이션 위젯
 *
 * Parameter (잠금화면 rectangular):
 *  - 비워두거나 'events' → 일정
 *  - 'todos' or '할일'   → 할일
 */

// ───────────────────────────────────────────────────
// 설정 — 아래 3개 값을 본인 환경에 맞게 채워야 한다
// ───────────────────────────────────────────────────
const NOTION_TOKEN = 'YOUR_NOTION_INTEGRATION_TOKEN'; // https://www.notion.so/my-integrations
const DB_ID = 'YOUR_NOTION_TASKS_DB_ID';              // 노션 TASK DB ID (32자 hex)
const APP_URL = 'https://your-tasks-app.vercel.app/'; // 위젯 탭하면 열리는 URL
const LOOKAHEAD_DAYS = 7;

// ───────────────────────────────────────────────────
// 모드 강제 (parameter 충돌 우회용)
// 같은 스크립트를 잠금화면 두 위젯에 동시 등록하면
// iOS가 widgetParameter를 안정적으로 분리 못 하는 경우가 있음.
// 그럴 땐 스크립트를 복제해서 한 쪽은 'events', 다른 쪽은 'todos' 로 설정.
// null로 두면 위젯 parameter 사용.
// ───────────────────────────────────────────────────
const FORCE_MODE = null; // 'events' | 'todos' | null

const PALETTE = {
  events: { tint: new Color('#60a5fa'), icon: 'calendar', label: '일정' },
  todos: { tint: new Color('#fb7185'), icon: 'checklist', label: '할일' },
};

// 홈화면 위젯 배경
// iOS는 3rd party 위젯의 진짜 투명을 시스템에서 막음.
// no-background hack을 쓰지 않는 한 흰/검정 시스템 카드가 강제됨.
// 옵션:
//   A. Color.clear() — alpha 0 (시스템이 그래도 흰 카드 그림, 결국 흰색)
//   B. Color.dynamic(라이트, 다크) — 시스템 모드 따라
//   C. 단일 어두운 색 — 항상 어둡게 (벽지에 좀 어울림)
const HOME_BG = Color.dynamic(new Color('#ffffff'), new Color('#1c1c1e'));
const HOME_FG = Color.dynamic(new Color('#0a0a0a'), new Color('#fafafa'));
const HOME_MUTED = Color.dynamic(new Color('#71717a'), new Color('#a1a1aa'));

// ───────────────────────────────────────────────────
// 분기
// ───────────────────────────────────────────────────
const family = config.widgetFamily ?? 'accessoryRectangular';
const param = String(config.widgetParameter ?? '').toLowerCase();
const mode =
  FORCE_MODE === 'todos' || FORCE_MODE === 'events'
    ? FORCE_MODE
    : param.includes('todo') || param.includes('할일')
      ? 'todos'
      : 'events';

let result;
if (family === 'medium' || family === 'large') {
  const [eventsRes, todosRes] = await Promise.all([
    fetchTasks('events'),
    fetchTasks('todos'),
  ]);
  if (eventsRes.error) result = eventsRes;
  else if (todosRes.error) result = todosRes;
  else result = { items: [...(eventsRes.items ?? []), ...(todosRes.items ?? [])] };
} else {
  result = await fetchTasks(mode);
}

let widget;
if (result.error) {
  widget = buildError(result.error, family);
} else {
  const tasks = result.items;
  switch (family) {
    case 'accessoryInline':
      widget = buildInline(tasks);
      break;
    case 'accessoryCircular':
      widget = buildCircular(tasks);
      break;
    case 'accessoryRectangular':
      widget = buildRectangular(tasks, mode);
      break;
    case 'medium':
    case 'large':
      widget = buildMedium(tasks, family);
      break;
    default:
      widget = buildSmall(tasks, mode);
  }
}

widget.url = APP_URL;

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentLarge();
}
Script.complete();

// ───────────────────────────────────────────────────
// 노션 호출 — 에러는 객체로 리턴해서 위젯에 표시
// ───────────────────────────────────────────────────
async function fetchTasks(targetMode) {
  if (!NOTION_TOKEN || NOTION_TOKEN.includes('여기에')) {
    return { error: 'NOTION_TOKEN을\n채워주세요' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(today.getDate() + LOOKAHEAD_DAYS);

  const typeFilter = {
    property: '유형',
    select: { equals: targetMode === 'todos' ? '할일' : '일정' },
  };

  const dateFilter =
    targetMode === 'todos'
      ? { or: [
          { property: '태스크 기간', date: { is_empty: true } },
          { property: '태스크 기간', date: { on_or_before: toDateOnly(end) } },
        ] }
      : { and: [
          { property: '태스크 기간', date: { on_or_after: toDateOnly(today) } },
          { property: '태스크 기간', date: { on_or_before: toDateOnly(end) } },
        ] };

  const req = new Request(`https://api.notion.com/v1/databases/${DB_ID}/query`);
  req.method = 'POST';
  req.headers = {
    Authorization: `Bearer ${NOTION_TOKEN}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  };
  req.body = JSON.stringify({
    filter: {
      and: [
        typeFilter,
        dateFilter,
        { or: [
            { property: '상태', status: { equals: '예정' } },
            { property: '상태', status: { equals: '진행중' } },
            { property: '상태', status: { equals: '보류' } },
        ] },
      ],
    },
    sorts: [{ property: '태스크 기간', direction: 'ascending' }],
    page_size: 12,
  });

  try {
    const res = await req.loadJSON();
    if (res?.object === 'error') {
      const code = res.code ?? 'unknown';
      if (code === 'unauthorized') {
        return { error: '토큰 오류\n인테그레이션 확인' };
      }
      if (code === 'object_not_found' || code === 'restricted_resource') {
        return { error: 'DB 접근 불가\n노션에서 Connections 추가' };
      }
      return { error: res.message || code };
    }
    if (!res?.results) {
      return { error: '응답 형식 오류' };
    }
    const items = res.results.map((page) => {
      const props = page.properties ?? {};
      return {
        title: props['태스크']?.title?.[0]?.plain_text ?? '제목 없음',
        start: props['태스크 기간']?.date?.start ?? null,
        end: props['태스크 기간']?.date?.end ?? null,
        type: props['유형']?.select?.name ?? '할일',
        status: props['상태']?.status?.name ?? '예정',
      };
    });
    return { items };
  } catch (err) {
    const msg = err?.message || String(err);
    return { error: `오류\n${msg.slice(0, 60)}` };
  }
}

function toDateOnly(d) {
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

// ───────────────────────────────────────────────────
// 에러 위젯
// ───────────────────────────────────────────────────
function buildError(msg, fam) {
  const w = new ListWidget();
  if (fam === 'medium' || fam === 'large' || fam === 'small') {
    const grad = new LinearGradient();
    grad.colors = [new Color('#fb7185'), new Color('#f43f5e')];
    grad.locations = [0, 1];
    w.backgroundGradient = grad;
    const t = w.addText(`⚠️ ${msg}`);
    t.font = Font.semiboldSystemFont(13);
    t.textColor = Color.white();
    return w;
  }
  const t = w.addText(`⚠️ ${msg}`);
  t.font = Font.semiboldSystemFont(12);
  return w;
}

// ───────────────────────────────────────────────────
// 잠금화면 inline
// ───────────────────────────────────────────────────
function buildInline(items) {
  const w = new ListWidget();
  const next = items[0];
  if (!next) {
    const t = w.addText('자유로운 하루');
    t.font = Font.semiboldSystemFont(13);
    return w;
  }
  const time = next.start ? formatTime(new Date(next.start)) : '';
  const text = time ? `${time} ${next.title}` : next.title;
  const t = w.addText(text);
  t.font = Font.semiboldSystemFont(13);
  t.lineLimit = 1;
  return w;
}

// ───────────────────────────────────────────────────
// 잠금화면 circular
// ───────────────────────────────────────────────────
function buildCircular(items) {
  const w = new ListWidget();
  const t = w.addText(String(items.length));
  t.font = Font.boldSystemFont(22);
  t.centerAlignText();
  return w;
}

// ───────────────────────────────────────────────────
// 잠금화면 rectangular — 폰트 키운 버전
// ───────────────────────────────────────────────────
function buildRectangular(items, currentMode) {
  const w = new ListWidget();
  w.setPadding(2, 4, 2, 4);

  if (items.length === 0) {
    const t = w.addText(currentMode === 'todos' ? '할일 없음' : '일정 없음');
    t.font = Font.regularSystemFont(11);
    t.textOpacity = 0.6;
    return w;
  }

  const limit = 4;
  for (let i = 0; i < Math.min(items.length, limit); i++) {
    const t = items[i];
    const row = w.addStack();
    row.layoutHorizontally();
    row.centerAlignContent();
    row.spacing = 4;

    if (currentMode === 'todos') {
      const dot = row.addText('○');
      dot.font = Font.regularSystemFont(11);
      dot.textOpacity = 0.75;
    } else {
      const start = t.start ? new Date(t.start) : null;
      if (start) {
        const time = row.addText(formatTimeShort(start));
        time.font = Font.regularSystemFont(10);
        time.textOpacity = 0.75;
      }
    }

    const title = row.addText(t.title);
    title.font = Font.semiboldSystemFont(11);
    title.lineLimit = 1;
    title.minimumScaleFactor = 0.85;

    if (i < limit - 1 && i < items.length - 1) w.addSpacer(1);
  }

  w.addSpacer();
  return w;
}

// ───────────────────────────────────────────────────
// 홈화면 공통
// ───────────────────────────────────────────────────
function newHomeWidget() {
  const w = new ListWidget();
  w.backgroundColor = HOME_BG;
  w.setPadding(10, 12, 10, 12);
  return w;
}

// ───────────────────────────────────────────────────
// 홈화면 small — 한 종류 리스트만 상단 정렬
// ───────────────────────────────────────────────────
function buildSmall(items, currentMode) {
  const w = newHomeWidget();

  if (items.length === 0) {
    const empty = w.addText(currentMode === 'todos' ? '할일 없음' : '일정 없음');
    empty.font = Font.regularSystemFont(12);
    empty.textColor = HOME_MUTED;
    w.addSpacer();
    return w;
  }

  const limit = 6;
  for (let i = 0; i < Math.min(items.length, limit); i++) {
    addRow(w, items[i], currentMode);
    if (i < limit - 1 && i < items.length - 1) w.addSpacer(3);
  }
  w.addSpacer();
  return w;
}

// ───────────────────────────────────────────────────
// 홈화면 medium / large — 좌우 분할, 헤더 없이 상단 정렬
// ───────────────────────────────────────────────────
function buildMedium(items, fam) {
  const w = newHomeWidget();

  // 상단: 날짜 · 시간
  const head = w.addStack();
  head.layoutHorizontally();
  head.centerAlignContent();
  const dateText = head.addText(formatTodayLong());
  dateText.font = Font.boldSystemFont(15);
  dateText.textColor = HOME_FG;
  head.addSpacer();
  const timeText = head.addText(formatNowTime());
  timeText.font = Font.semiboldSystemFont(13);
  timeText.textColor = HOME_MUTED;

  w.addSpacer(10);

  // 좌측: 할일, 우측: 일정 (균등 너비)
  const grid = w.addStack();
  grid.layoutHorizontally();
  grid.spacing = 14;
  grid.topAlignContent();

  const eventsItems = items.filter((t) => t.type === '일정');
  const todosItems = items.filter((t) => t.type === '할일');
  const limit = fam === 'large' ? 16 : 8;
  const colWidth = 140;

  const left = grid.addStack();
  left.layoutVertically();
  left.size = new Size(colWidth, 0);
  addColumn(left, todosItems, 'todos', limit);

  const right = grid.addStack();
  right.layoutVertically();
  right.size = new Size(colWidth, 0);
  addColumn(right, eventsItems, 'events', limit);

  return w;
}

function addColumn(stack, items, colMode, limit) {
  if (items.length === 0) {
    const empty = stack.addText(colMode === 'todos' ? '할일 없음' : '일정 없음');
    empty.font = Font.regularSystemFont(11);
    empty.textColor = HOME_MUTED;
    stack.addSpacer();
    return;
  }

  for (let i = 0; i < Math.min(items.length, limit); i++) {
    addRow(stack, items[i], colMode);
    if (i < limit - 1 && i < items.length - 1) stack.addSpacer(2);
  }
  stack.addSpacer();
}

function addRow(parent, task, rowMode) {
  const row = parent.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.spacing = 4;

  if (rowMode === 'todos') {
    const dot = row.addText('○');
    dot.font = Font.regularSystemFont(10);
    dot.textColor = HOME_MUTED;
  } else if (task.start) {
    const time = row.addText(formatTimeShort(new Date(task.start)));
    time.font = Font.regularSystemFont(9);
    time.textColor = HOME_MUTED;
  }

  const title = row.addText(task.title);
  title.font = Font.semiboldSystemFont(10);
  title.textColor = HOME_FG;
  title.lineLimit = 1;
  title.minimumScaleFactor = 0.8;
}

// ───────────────────────────────────────────────────
// 시간 포맷
// ───────────────────────────────────────────────────
function formatTime(d) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = d.toDateString() === today.toDateString();
  const hh = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ampm = hh < 12 ? '오전' : '오후';
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  if (isToday) return `${ampm} ${h12}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${ampm} ${h12}:${mm}`;
}

function formatTimeShort(d) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = d.toDateString() === today.toDateString();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  if (isToday) return `${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

function formatToday() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}.${d.getDate()} (${days[d.getDay()]})`;
}

function formatTodayLong() {
  const d = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${days[d.getDay()]})`;
}

function formatNowTime() {
  const d = new Date();
  const hh = d.getHours();
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ampm = hh < 12 ? '오전' : '오후';
  const h12 = hh === 0 ? 12 : hh > 12 ? hh - 12 : hh;
  return `${ampm} ${h12}:${mm}`;
}
