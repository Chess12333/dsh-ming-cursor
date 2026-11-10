// dsh-ming-cursor 的设置页：一只光标，加上它什么时候在、怎么说话。
//
// 挂在哪里（2026-11-10 她定的）：装了 dsh-ming-graph（「她的一生」）→ 挂进它的顶栏；
// 没装 → 自己注册一个 settings.section。两边都不硬依赖对方。
window.__ModuleLoader__.load({
  id: 'dsh-ming-cursor',
  factory(require) {
    const React = require('react')
    const { useEffect, useState, useCallback } = React
    const h = React.createElement

    const API = '/dsh-ming-cursor/api'
    const ASSET = '/dsh-ming-cursor/assets/cursors'

    const C = {
      text: 'var(--dsw-alias-label-primary, #e8e8ee)',
      sub: 'var(--dsw-alias-label-secondary, #b8b8c4)',
      faint: 'var(--dsw-alias-label-tertiary, #8d8d9c)',
      border: 'var(--dsw-alias-border-primary, rgba(255,255,255,.12))',
      bg: 'var(--dsw-alias-bg-secondary, #191920)',
      input: 'var(--dsw-alias-bg-primary, #101016)',
      accent: 'var(--dsw-alias-brand-primary, #6aa9ff)',
      danger: 'var(--dsw-alias-state-error-primary, #ff6b6b)',
      ok: 'var(--dsw-alias-state-success-primary, #59d18b)',
      warn: '#d9a441',
    }

    const S = {
      page: { maxWidth: '820px', color: C.text },
      card: { border: `1px solid ${C.border}`, borderRadius: '12px', padding: '16px', background: C.bg, marginBottom: '12px' },
      title: { fontSize: '13px', fontWeight: 700, marginBottom: '4px' },
      hint: { fontSize: '11.5px', color: C.faint, lineHeight: '1.7' },
      row: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
      modeBtn: (on) => ({
        border: `1px solid ${on ? C.accent : C.border}`,
        background: on ? C.accent : 'transparent',
        color: on ? '#08111f' : C.text,
        borderRadius: '8px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: on ? 700 : 400,
      }),
      btn: { border: `1px solid ${C.border}`, background: 'transparent', color: C.text, borderRadius: '8px', padding: '7px 12px', fontSize: '12px', cursor: 'pointer' },
      primary: { border: `1px solid ${C.accent}`, background: C.accent, color: '#08111f', borderRadius: '8px', padding: '7px 14px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 },
      num: { width: '88px', background: C.input, color: C.text, border: `1px solid ${C.border}`, borderRadius: '7px', padding: '6px 8px', fontSize: '12px' },
      range: { flex: '1 1 200px', minWidth: '120px', accentColor: C.accent, cursor: 'pointer' },
      grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: '8px', marginTop: '10px' },
      cell: (on) => ({
        border: `1px solid ${on ? C.accent : C.border}`,
        background: on ? 'rgba(106,169,255,.12)' : 'transparent',
        borderRadius: '10px', padding: '10px 6px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
      }),
      sprite: (px) => ({
        width: px + 'px', height: px + 'px', display: 'block', imageRendering: 'pixelated',
        backgroundImage: '', backgroundSize: '800% 300%', backgroundPosition: '0 0',
      }),
      cellName: { fontSize: '11px', color: C.sub },
      previewBox: {
        width: '104px', height: '104px', borderRadius: '14px', border: `1px solid ${C.border}`,
        background: '#0d0d13', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 104px',
      },
      preview: { display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap' },
      stateLine: { fontSize: '11.5px', color: C.faint, lineHeight: '1.7' },
      note: { fontSize: '11.5px', color: C.ok, minHeight: '16px', lineHeight: '1.6' },
      error: { fontSize: '11.5px', color: C.danger, minHeight: '16px', lineHeight: '1.6' },
      banner: {
        border: `1px solid ${C.warn}`, background: 'rgba(217,164,65,.10)',
        borderRadius: '10px', padding: '10px 14px', marginBottom: '12px',
        fontSize: '11.5px', color: C.sub, lineHeight: '1.7',
      },
    }

    const STYLES = [
      ['pointer', '指针'], ['link', '链接'], ['text', '文本'], ['cross', '十字'], ['help', '帮助'],
      ['move', '移动'], ['vert', '上下'], ['horz', '左右'], ['dgn1', '斜向1'], ['dgn2', '斜向2'],
      ['unavailiable', '禁止'], ['busy', '忙碌'], ['work', '工作'], ['handwriting', '手写'], ['alternate', '备用'],
    ]
    const STYLE_LABEL = {}
    STYLES.forEach(([id, label]) => { STYLE_LABEL[id] = label })

    // 素材是 8 列 × 3 行的雪碧图：只取左上那一格（整张缩到 32px 就是一团糊）
    function sprite(x, px) {
      return Object.assign({}, S.sprite(px), {
        backgroundImage: 'url(' + ASSET + '/' + x + '.png)',
      })
    }

    // >>> 共享光标页（源 C:/dsh/dsh-ming-ui/src/cursor-page.js —— 改源后跑 sync-cursor-page.mjs，别手改这段）
    function makeCursorPage(React, io) {
      const h = React.createElement

      // 15 个状态的名字两边共用一份，免得同一个图标在两边叫不同的名字
      const STYLE_LABELS = {
        pointer: '指针', work: '干活', unavailiable: '不可用', link: '可点', text: '文本',
        cross: '精确', busy: '等待', move: '移动', vert: '上下', horz: '左右',
        help: '求助', handwriting: '手写', dgn1: '对角一', dgn2: '对角二', alternate: '备用',
      }
      const labelOf = (id) => STYLE_LABELS[id] || id

      const S = {
        page: { padding: '18px 20px 26px', maxWidth: '1080px', color: '#e8edf6', fontSize: '14px' },
        head: { display: 'flex', alignItems: 'baseline', gap: '12px', margin: '0 0 14px' },
        h1: { fontSize: '17px', fontWeight: 600, margin: 0, letterSpacing: '.3px' },
        headNote: { fontSize: '12.5px', color: '#8b9ab3' },
        banner: {
          margin: '0 0 14px', padding: '10px 14px', borderRadius: '10px',
          background: 'rgba(255,170,60,.10)', border: '1px solid rgba(255,170,60,.32)',
          color: '#f0b45c', fontSize: '13px', lineHeight: 1.7,
        },
        card: {
          border: '1px solid rgba(255,255,255,.09)', borderRadius: '14px',
          background: 'rgba(255,255,255,.025)', padding: '16px 18px', margin: '0 0 14px',
        },
        hero: { display: 'flex', gap: '20px', alignItems: 'flex-start', flexWrap: 'wrap' },
        stage: {
          width: '132px', height: '132px', flex: '0 0 auto', borderRadius: '12px',
          background: 'radial-gradient(circle at 50% 45%, rgba(120,170,255,.18), rgba(0,0,0,.25) 70%)',
          border: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        },
        body: { flex: '1 1 320px', minWidth: 0 },
        title: { fontSize: '15px', fontWeight: 600, margin: '2px 0 6px' },
        hint: { fontSize: '12.5px', color: '#8b9ab3', lineHeight: 1.7 },
        row: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '12px' },
        seg: { display: 'inline-flex', border: '1px solid rgba(255,255,255,.14)', borderRadius: '10px', overflow: 'hidden' },
        segBtn: (on) => ({
          padding: '7px 15px', fontSize: '13px', cursor: 'pointer', border: 0,
          background: on ? 'rgba(120,170,255,.22)' : 'transparent',
          color: on ? '#cfe2ff' : '#98a6bd', fontWeight: on ? 600 : 400,
        }),
        num: {
          width: '92px', padding: '6px 9px', borderRadius: '8px', fontSize: '13px',
          border: '1px solid rgba(255,255,255,.14)', background: 'rgba(0,0,0,.22)', color: '#e8edf6',
        },
        range: { flex: '1 1 220px', minWidth: '160px', accentColor: '#78aaff' },
        value: { fontSize: '12.5px', color: '#9fb3d1', minWidth: '52px', textAlign: 'right' },
        secTitle: { fontSize: '13px', fontWeight: 600, color: '#c7d5ea', margin: '0 0 4px' },
        grid: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '10px' },
        cell: (on) => ({
          width: '76px', padding: '9px 6px 7px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
          border: on ? '1px solid rgba(120,170,255,.75)' : '1px solid rgba(255,255,255,.09)',
          background: on ? 'rgba(120,170,255,.16)' : 'rgba(255,255,255,.02)',
        }),
        cellName: { display: 'block', fontSize: '11.5px', color: '#9fb3d1', marginTop: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
        foot: { display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' },
        primary: {
          padding: '8px 18px', borderRadius: '10px', border: 0, cursor: 'pointer', fontSize: '13.5px', fontWeight: 600,
          background: 'linear-gradient(180deg,#6f9dff,#4a7fe6)', color: '#fff',
        },
        btn: {
          padding: '8px 14px', borderRadius: '10px', cursor: 'pointer', fontSize: '13px',
          border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.04)', color: '#cbd8ea',
        },
        line: { fontSize: '12.5px', color: '#8b9ab3', marginTop: '10px', minHeight: '18px' },
        err: { fontSize: '12.5px', color: '#ff9a9a', marginTop: '6px', minHeight: '18px' },
        empty: { padding: '40px', textAlign: 'center', color: '#8b9ab3', fontSize: '13px' },
      }

      return function CursorPage() {
        const [cfg, setCfg] = React.useState(null)
        const [styles, setStyles] = React.useState([])
        const [busy, setBusy] = React.useState(false)
        const [note, setNote] = React.useState('')
        const [error, setError] = React.useState('')
        const [live, setLive] = React.useState('')
        const [banner, setBanner] = React.useState('')
        const [extra, setExtra] = React.useState(null)   // 完整版才有：开口节奏 / 模型 / 晃动识别
        const [holdDraft, setHoldDraft] = React.useState(null)   // 输入框里正在打的数，别每敲一下都保存
        const [sizeDraft, setSizeDraft] = React.useState(null)

        const reload = React.useCallback(() => {
          setError('')
          Promise.resolve()
            .then(() => io.load())
            .then((r) => {
              setCfg(r.cfg)
              setStyles(r.styles || [])
              setBanner(r.banner || '')
              return io.extra ? io.extra.load().then((x) => setExtra(x || null)).catch(() => setExtra(null)) : null
            })
            .catch((e) => setError('读不到：' + (e && e.message ? e.message : e)))
        }, [])

        React.useEffect(() => { reload() }, [reload])

        const put = (patch) => {
          const merged = Object.assign({}, cfg, patch || {})
          setCfg(merged)
          setBusy(true); setNote(''); setError('')
          Promise.resolve()
            .then(() => io.save(merged))
            .then((r) => { if (r && r.cfg) setCfg(r.cfg); setNote('已生效') })
            .catch((e) => setError('没存上：' + (e && e.message ? e.message : e)))
            .then(() => setBusy(false), () => setBusy(false))
        }

        const putExtra = (kind, patch) => {
          if (!io.extra) return
          Promise.resolve()
            .then(() => io.extra.save(kind, patch))
            .then((r) => { if (r) setExtra((cur) => Object.assign({}, cur, r)); setNote('已生效') })
            .catch((e) => setError('没存上：' + (e && e.message ? e.message : e)))
        }

        const tryIt = () => {
          setLive('正在叫光标…'); setError('')
          Promise.resolve()
            .then(() => io.tryIt())
            .then((t) => setLive(t || '好了'))
            .catch((e) => { setLive(''); setError('没叫出来：' + (e && e.message ? e.message : e)) })
        }

        if (!cfg && !error) return h('div', { style: S.page }, h('div', { style: S.empty }, '正在读光标设置…'))

        if (!cfg) {
          return h('div', { style: S.page },
            h('div', { style: S.head }, h('div', { style: S.h1 }, 'AI 光标')),
            h('div', { style: S.banner }, error),
            h('div', { style: S.foot }, h('button', { style: S.btn, onClick: reload }, '重试')))
        }

        const clean = cfg.mode === 'clean'
        const secs = Math.round((cfg.holdMs || 2600) / 100) / 10

        return h('div', { style: S.page },
          h('div', { style: S.head },
            h('div', { style: S.h1 }, 'AI 光标'),
            h('div', { style: S.headNote }, io.note || '桌面上那只指针；它按正在做的事自己换姿势')),

          banner ? h('div', { style: S.banner }, banner) : null,

          // ① 一眼看到：现在长什么样 + 什么时候在
          h('div', { style: S.card },
            h('div', { style: S.hero },
              h('div', { style: S.stage }, h('span', { style: io.sprite(cfg.style, 72) })),
              h('div', { style: S.body },
                h('div', { style: S.title }, labelOf(cfg.style)),
                h('div', { style: S.hint }, clean
                  ? '露 ' + secs + ' 秒，然后自己收（适合不想被它一直挡着的时候）'
                  : '一直在屏幕上，直到收起（陪伴：看得见它在忙什么）'),

                h('div', { style: S.row },
                  h('div', { style: S.seg },
                    h('button', { style: S.segBtn(!clean), disabled: busy, onClick: () => put({ mode: 'companion' }) }, '陪伴'),
                    h('button', { style: S.segBtn(clean), disabled: busy, onClick: () => put({ mode: 'clean' }) }, '整洁')),
                  clean ? h('span', { style: S.hint }, '露多久') : null,
                  clean ? h('input', {
                    type: 'number', min: 400, max: 60000, step: 100, style: S.num,
                    value: holdDraft == null ? cfg.holdMs : holdDraft,
                    onChange: (e) => setHoldDraft(Number(e.target.value)),
                    onBlur: () => { const v = Math.max(400, Math.min(60000, Number(holdDraft) || cfg.holdMs)); setHoldDraft(null); if (v !== cfg.holdMs) put({ holdMs: v }) },
                  }) : null,
                  clean ? h('span', { style: S.hint }, '毫秒') : null,
                ),

                h('div', { style: S.row },
                  h('span', { style: Object.assign({}, S.hint, { whiteSpace: 'nowrap' }) }, '大小'),
                  h('input', {
                    type: 'range', min: 24, max: 192, step: 4, style: S.range,
                    value: sizeDraft == null ? cfg.size : sizeDraft,
                    onChange: (e) => setSizeDraft(Number(e.target.value)),
                    onMouseUp: () => { if (sizeDraft != null && sizeDraft !== cfg.size) put({ size: sizeDraft }); setSizeDraft(null) },
                    onTouchEnd: () => { if (sizeDraft != null && sizeDraft !== cfg.size) put({ size: sizeDraft }); setSizeDraft(null) },
                  }),
                  h('span', { style: S.value }, (sizeDraft == null ? cfg.size : sizeDraft) + 'px')),
              )),
          ),

          // ② 换样子：点一下就换
          h('div', { style: S.card },
            h('div', { style: S.secTitle }, '样子'),
            h('div', { style: S.hint }, '点一下就换。屏幕上那只按状态自己变姿势，这里定的是默认那只。'),
            h('div', { style: S.grid },
              styles.map((id) => h('div', {
                key: id, style: S.cell(cfg.style === id), title: id,
                onClick: () => put({ style: id }),
              },
              h('span', { style: io.sprite(id, 30) }),
              h('span', { style: S.cellName }, labelOf(id)))))),

          // ②' 陪伴（只有完整版才有这些；轻量版 io.extra 为空，整块不出现）
          extra ? h('div', { style: S.card },
            h('div', { style: S.secTitle }, '陪伴'),
            h('div', { style: S.hint }, '它什么时候自己开口、用哪个模型、晃一下鼠标算不算叫你——这些归完整版管，改完立刻生效。'),

            extra.sched ? h('div', null,
              h('div', { style: S.row },
                h('span', { style: Object.assign({}, S.hint, { whiteSpace: 'nowrap' }) }, '开口节奏'),
                h('select', {
                  style: S.num, value: extra.sched.gapMode || 'off',
                  onChange: (e) => putExtra('sched', { gapMode: e.target.value }),
                },
                  h('option', { value: 'off' }, '关'),
                  h('option', { value: 'fixed' }, '定时'),
                  h('option', { value: 'random' }, '随机'),
                  h('option', { value: 'heartbeat' }, '心跳')),
                h('span', { style: S.hint }, '今天 ' + (extra.sched.spokenToday || 0) + ' 句'),
                extra.sched.nextAt ? h('span', { style: S.hint }, '· 下次约 ' + String(extra.sched.nextAt).slice(11, 16)) : null),

              extra.sched.gapMode === 'heartbeat' ? h('div', { style: S.row },
                h('span', { style: S.hint }, '最低'),
                h('input', { type: 'number', min: 1, max: 1440, style: S.num, value: extra.sched.hbMin,
                  onChange: (e) => setExtra((c) => Object.assign({}, c, { sched: Object.assign({}, c.sched, { hbMin: Number(e.target.value) }) })),
                  onBlur: (e) => putExtra('sched', { hbMin: Number(e.target.value) }) }),
                h('span', { style: S.hint }, '中位'),
                h('input', { type: 'number', min: 1, max: 1440, style: S.num, value: extra.sched.hbCenter,
                  onChange: (e) => setExtra((c) => Object.assign({}, c, { sched: Object.assign({}, c.sched, { hbCenter: Number(e.target.value) }) })),
                  onBlur: (e) => putExtra('sched', { hbCenter: Number(e.target.value) }) }),
                h('span', { style: S.hint }, '最高'),
                h('input', { type: 'number', min: 1, max: 1440, style: S.num, value: extra.sched.hbMax,
                  onChange: (e) => setExtra((c) => Object.assign({}, c, { sched: Object.assign({}, c.sched, { hbMax: Number(e.target.value) }) })),
                  onBlur: (e) => putExtra('sched', { hbMax: Number(e.target.value) }) }),
                h('span', { style: S.hint }, '分'))
                : h('div', { style: S.row },
                  h('span', { style: S.hint }, '间隔'),
                  h('input', { type: 'number', min: 1, max: 1440, style: S.num, value: extra.sched.minGapMinutes,
                    onChange: (e) => setExtra((c) => Object.assign({}, c, { sched: Object.assign({}, c.sched, { minGapMinutes: Number(e.target.value) }) })),
                    onBlur: (e) => putExtra('sched', { minGapMinutes: Number(e.target.value) }) }),
                  h('span', { style: S.hint }, '分钟')),

              h('div', { style: S.row },
                h('span', { style: S.hint }, '每天最多'),
                h('input', { type: 'number', min: 0, max: 999, style: S.num,
                  value: extra.sched.dailyMax < 0 ? '' : extra.sched.dailyMax,
                  disabled: extra.sched.dailyMax < 0,
                  onChange: (e) => setExtra((c) => Object.assign({}, c, { sched: Object.assign({}, c.sched, { dailyMax: Number(e.target.value) }) })),
                  onBlur: (e) => putExtra('sched', { dailyMax: Number(e.target.value) }) }),
                h('span', { style: S.hint }, '句'),
                h('button', { style: S.btn, onClick: () => putExtra('sched', { dailyMax: extra.sched.dailyMax < 0 ? 6 : -1 }) },
                  extra.sched.dailyMax < 0 ? '改成限额' : '不限'),
                h('button', { style: S.btn, onClick: reload }, '刷新')))
              : h('div', { style: S.hint }, '读不到节奏设置（完整版没在跑？）'),

            extra.models && extra.models.current ? h('div', { style: S.row },
              h('span', { style: Object.assign({}, S.hint, { whiteSpace: 'nowrap' }) }, '用哪个模型'),
              h('select', {
                style: Object.assign({}, S.num, { width: '300px' }),
                value: extra.models.current.provider + '||' + extra.models.current.model,
                onChange: (e) => {
                  const at = e.target.value.indexOf('||')
                  putExtra('model', at < 0
                    ? { talkProvider: '', talkModel: '' }
                    : { talkProvider: e.target.value.slice(0, at), talkModel: e.target.value.slice(at + 2) })
                },
              },
                h('option', { value: '' }, '插件默认'),
                (extra.models.providers || []).map((p) => (p.models && p.models.length
                  ? h('optgroup', { key: p.id, label: p.name || p.id },
                    p.models.map((m) => h('option', { key: p.id + '||' + m.id, value: p.id + '||' + m.id },
                      m.name && m.name !== m.id ? m.name + '（' + m.id + '）' : m.id)))
                  : h('option', { key: p.id, value: p.id + '||' + extra.models.current.model, disabled: true },
                    (p.name || p.id) + (p.error ? '（列不出来）' : '（没有模型目录）'))))),
              h('span', { style: S.hint }, extra.models.current.fromSettings ? '按这里选的' : '插件默认'))
              : null,

            extra.shake ? h('div', null,
              h('div', { style: S.row },
                h('span', { style: Object.assign({}, S.hint, { whiteSpace: 'nowrap' }) }, '晃一下鼠标'),
                h('div', { style: S.seg },
                  h('button', { style: S.segBtn(!!extra.shake.on), onClick: () => putExtra('shake', { on: true }) }, '算叫你'),
                  h('button', { style: S.segBtn(!extra.shake.on), onClick: () => putExtra('shake', { on: false }) }, '不理')),
                h('span', { style: S.hint }, '灵敏度'),
                h('select', { style: S.num, value: extra.shake.level, onChange: (e) => putExtra('shake', { level: e.target.value }) },
                  h('option', { value: 'low' }, '低'),
                  h('option', { value: 'medium' }, '中'),
                  h('option', { value: 'high' }, '高'))),
              h('div', { style: S.hint }, '开了之后：晃一下鼠标，光标飞过去问一句「框哪块」。'))
              : null)
            : null,

          // ③ 到底动没动：叫出来看一眼，别只信「保存成功」
          h('div', { style: S.foot },
            h('button', { style: S.primary, onClick: tryIt }, '在屏幕上试一下'),
            h('button', { style: S.btn, disabled: busy, onClick: reload }, '重新读')),

          h('div', { style: S.line }, live || note),
          h('div', { style: S.err }, error))
      }
    }
    // <<< 共享光标页

    // 这一页只跟自己的 sidecar 打交道；完整版在跑时它整套让开（apply 里判 conflict）。
    const CursorPage = makeCursorPage(React, {
      note: '桌面上那只指针；它按正在做的事自己换姿势',
      sprite: (id, px) => sprite(id, px),
      load: async () => {
        const d = await (await fetch(API + '/settings', { cache: 'no-store' })).json()
        if (!d || !d.ok || !d.settings) throw new Error((d && d.error) || '读不到设置')
        return { cfg: d.settings, styles: STYLES.map(([id]) => id) }
      },
      save: async (cfg) => {
        const d = await (await fetch(API + '/settings', {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(cfg),
        })).json()
        if (!d || !d.ok) throw new Error((d && d.error) || '没存上')
        return { cfg: d.settings }
      },
      tryIt: async () => {
        const d = await (await fetch(API + '/demo', { method: 'POST', cache: 'no-store' })).json()
        if (!d || !d.ok || !d.state) throw new Error((d && d.error) || 'sidecar 没连上')
        return d.state.visible
          ? ('出来了：(' + d.state.x + ', ' + d.state.y + ') · ' + d.state.size + 'px')
          : '没出来（sidecar 没连上）'
      },
    })

    // ---------------------------------------------------------------- 挂载
    const DESC = { id: 'cursor', label: '光标', order: 60, title: 'AI 光标：样子 / 大小 / 什么时候在', render: CursorPage }
    const SETTINGS_SPEC = { name: 'settings.section', id: 'ming-cursor', label: () => 'AI 光标', order: 42 }

    function registerSettings(ctx) {
      try {
        ctx.slots.inject('settings.section', () => ctx.slots.register(SETTINGS_SPEC, CursorPage))
        return true
      } catch (e) { return false }
    }

    return {
      apply(ctx) {
        if (typeof window === 'undefined') { registerSettings(ctx); return }

        // ⓪ 完整版（dsh-ming-mousepet）在的时候，整套让给它。
        //    完整版的「她的一生 → 桌宠」页里本来就有光标设置，这边再挂一份就是第二个面板，
        //    还要额外弹一条「装了完整版」的提示——那条提示本身就是在替重复辩护。
        //    （2026-11-10 她：那个面板该是完整版的；没装完整版时，这边才出现在设置里。）
        // ⓪ 完整版（dsh-ming-mousepet）在场：它自己带「光标」页，这边整套让开。
        //    两边都挂就是两个光标页 + 一句「建议禁用轻量版」——提示由完整版那页弹，这边不重复。
        //    （2026-11-10 她给的四种组合：只有完整版→完整版页；两边都在→完整版页+提示；
        //      只有轻量版→设置页；UI+轻量版→挂进「她的一生」。）
        const mount = () => {
          // ① 「她的一生」已经在了：直接挂进去，设置里不再出现。
          if (window.__MING_TAB_HOST && typeof window.__MING_TAB_HOST.add === 'function') {
            window.__MING_TAB_HOST.add(DESC)
            return
          }

          // ② 它还没挂上，可能马上就挂（两个都是 immediately 加载，先后不定）。
          //    先排队；1.5 秒内没人来收，说明这台机器没装它 —— 自己开一个设置页。
          ;(window.__MING_TABS_PENDING || (window.__MING_TABS_PENDING = [])).push(DESC)
          setTimeout(() => {
            if (window.__MING_TAB_HOST && typeof window.__MING_TAB_HOST.add === 'function') return
            const q = window.__MING_TABS_PENDING
            if (Array.isArray(q)) {
              const i = q.indexOf(DESC)
              if (i >= 0) q.splice(i, 1)
            }
            registerSettings(ctx)
          }, 1500)
        }

        fetch(API + '/settings', { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => { if (!(d && d.conflict)) mount() })
          .catch(() => mount()) // 读不到就当没有完整版，按老路挂上
      },
    }
  },
})
